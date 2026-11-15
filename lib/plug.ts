/**
 * Prise connectée (Tuya / LSC Smart Power Plug) qui alimente le serveur Plex.
 *
 * Permet de rétablir le courant à distance quand le serveur est planté. Avant
 * toute coupure, on vérifie qu'aucune mise à jour ne tourne sur le serveur
 * (SSH restreint via Tailscale) et qu'aucune lecture Plex n'est en cours.
 * Rien ici n'est joué côté client : tout passe par /api/plex/plug.
 */
import { createHash, createHmac, randomUUID } from "node:crypto";
import { Client } from "ssh2";

export type PlugStatus = {
    on: boolean;
    powerW: number;
    voltageV: number;
};

export type PlugBlocker = { kind: "update" | "playback"; detail: string };

export type PlugCheck = {
    blockers: PlugBlocker[];
    /** Vérifications qui n'ont pas pu être faites (serveur planté, Plex injoignable…). */
    warnings: string[];
};

export type PlugActionResult =
    | { ok: true; message: string; warnings: string[] }
    | { ok: false; blocked: true; blockers: PlugBlocker[]; warnings: string[] }
    | { ok: false; blocked: false; error: string };

/* ── Configuration ─────────────────────────────────────────── */

const TUYA_HOSTS: Record<string, string> = {
    eu: "https://openapi.tuyaeu.com",
    "eu-w": "https://openapi-weaz.tuyaeu.com",
    us: "https://openapi.tuyaus.com",
    "us-e": "https://openapi-ueaz.tuyaus.com",
};

function tuyaConfig() {
    const id = process.env.TUYA_ACCESS_ID;
    const secret = process.env.TUYA_ACCESS_SECRET;
    const deviceId = process.env.TUYA_DEVICE_ID;
    const host = TUYA_HOSTS[process.env.TUYA_REGION ?? "eu"];
    if (!id || !secret || !deviceId || !host) return null;
    return { id, secret, deviceId, host };
}

/** true si la prise est configurée sur ce déploiement (sinon le panneau reste caché). */
export function plugConfigured(): boolean {
    return tuyaConfig() !== null;
}

/* ── API cloud Tuya (requêtes signées HMAC-SHA256) ─────────── */

let cachedToken: { value: string; expiresAt: number } | null = null;

type TuyaResponse<T> = { success: boolean; result: T; code?: number; msg?: string };

async function tuyaCall<T>(method: "GET" | "POST", path: string, body?: unknown, withToken = true): Promise<T> {
    const cfg = tuyaConfig();
    if (!cfg) throw new Error("Prise non configurée (TUYA_*)");

    const token = withToken ? await tuyaToken() : "";
    const payload = body === undefined ? "" : JSON.stringify(body);
    const t = String(Date.now());
    const nonce = randomUUID().replace(/-/g, "");
    const stringToSign = [method, createHash("sha256").update(payload).digest("hex"), "", path].join("\n");
    const sign = createHmac("sha256", cfg.secret)
        .update(cfg.id + token + t + nonce + stringToSign)
        .digest("hex")
        .toUpperCase();

    const res = await fetch(cfg.host + path, {
        method,
        headers: {
            client_id: cfg.id,
            sign,
            t,
            nonce,
            sign_method: "HMAC-SHA256",
            "Content-Type": "application/json",
            ...(token ? { access_token: token } : {}),
        },
        body: payload || undefined,
        signal: AbortSignal.timeout(10_000),
        cache: "no-store",
    });
    const json = (await res.json()) as TuyaResponse<T>;
    if (!json.success) throw new Error(`Tuya : code ${json.code} — ${json.msg}`);
    return json.result;
}

async function tuyaToken(): Promise<string> {
    if (cachedToken && cachedToken.expiresAt > Date.now() + 60_000) return cachedToken.value;
    const r = await tuyaCall<{ access_token: string; expire_time: number }>("GET", "/v1.0/token?grant_type=1", undefined, false);
    cachedToken = { value: r.access_token, expiresAt: Date.now() + r.expire_time * 1000 };
    return r.access_token;
}

export async function getPlugStatus(): Promise<PlugStatus> {
    const cfg = tuyaConfig();
    if (!cfg) throw new Error("Prise non configurée");
    const items = await tuyaCall<{ code: string; value: unknown }[]>("GET", `/v1.0/devices/${cfg.deviceId}/status`);
    const byCode = Object.fromEntries(items.map((i) => [i.code, i.value]));
    return {
        on: byCode.switch_1 === true,
        powerW: Number(byCode.cur_power ?? 0) / 10,
        voltageV: Number(byCode.cur_voltage ?? 0) / 10,
    };
}

async function setSwitch(on: boolean): Promise<void> {
    const cfg = tuyaConfig();
    if (!cfg) throw new Error("Prise non configurée");
    const ok = await tuyaCall<boolean>("POST", `/v1.0/devices/${cfg.deviceId}/commands`, {
        commands: [{ code: "switch_1", value: on }],
    });
    if (ok !== true) throw new Error("Commande refusée par Tuya");
}

/* ── Vérification : mise à jour en cours sur le serveur (SSH) ── */

export type Probe = { state: "ok" | "blocked" | "unreachable"; detail: string };

/**
 * La clé SSH est restreinte côté serveur à un script qui exécute `pgrep` sur les
 * processus apt/dpkg/unattended-upgrade : code 0 = mise à jour en cours, 1 = aucune.
 * La commande envoyée est ignorée par le serveur.
 */
function probeUpdates(): Promise<Probe> {
    const host = process.env.PLUG_SSH_HOST;
    const username = process.env.PLUG_SSH_USER ?? "serveur";
    const keyB64 = process.env.PLUG_SSH_KEY_B64;
    const pinned = process.env.PLUG_SSH_HOST_KEY_SHA256; // empreinte ssh-keygen -l, sans "SHA256:"
    if (!host || !keyB64) {
        return Promise.resolve({ state: "unreachable", detail: "SSH non configuré (PLUG_SSH_*)" });
    }

    return new Promise((resolve) => {
        const conn = new Client();
        let settled = false;
        const done = (r: Probe) => {
            if (settled) return;
            settled = true;
            clearTimeout(timer);
            conn.end();
            resolve(r);
        };
        const timer = setTimeout(() => done({ state: "unreachable", detail: "délai dépassé" }), 15_000);

        conn.on("ready", () => {
            conn.exec("check", (err, stream) => {
                if (err) return done({ state: "unreachable", detail: "commande SSH refusée" });
                let out = "";
                stream.on("data", (d: Buffer) => (out += d.toString()));
                stream.stderr.on("data", () => {});
                stream.on("close", (code: number | null) => {
                    if (code === 0) done({ state: "blocked", detail: out.trim() });
                    else if (code === 1) done({ state: "ok", detail: "" });
                    else done({ state: "unreachable", detail: `code de sortie ${code}` });
                });
            });
        });
        conn.on("error", (e) => done({ state: "unreachable", detail: e.message }));
        conn.connect({
            host,
            port: 22,
            username,
            privateKey: Buffer.from(keyB64, "base64").toString("utf8"),
            readyTimeout: 8_000,
            hostHash: "sha256",
            hostVerifier: (fingerprintHex: string) => {
                if (!pinned) return true;
                const b64 = Buffer.from(fingerprintHex, "hex").toString("base64").replace(/=+$/, "");
                return b64 === pinned.replace(/^SHA256:/, "");
            },
        });
    });
}

/* ── Vérification : lecture Plex en cours ─────────────────── */

export async function probePlayback(): Promise<Probe> {
    const baseUrl = process.env.PLEX_URL?.replace(/\/$/, "");
    const token = process.env.PLEX_TOKEN;
    if (!baseUrl || !token) return { state: "unreachable", detail: "Plex non configuré" };
    try {
        const res = await fetch(`${baseUrl}/status/sessions`, {
            headers: { Accept: "application/json", "X-Plex-Token": token },
            signal: AbortSignal.timeout(8_000),
            cache: "no-store",
        });
        if (!res.ok) return { state: "unreachable", detail: `Plex a répondu ${res.status}` };
        const json = (await res.json()) as {
            MediaContainer: {
                Metadata?: { title?: string; grandparentTitle?: string; User?: { title?: string }; Player?: { state?: string } }[];
            };
        };
        const sessions = json.MediaContainer.Metadata ?? [];
        if (sessions.length === 0) return { state: "ok", detail: "" };
        const detail = sessions
            .map((m) => {
                const title = m.grandparentTitle ? `${m.grandparentTitle} — ${m.title ?? "?"}` : (m.title ?? "?");
                return `${m.User?.title ?? "?"} : ${title} (${m.Player?.state ?? "?"})`;
            })
            .join("\n");
        return { state: "blocked", detail };
    } catch {
        return { state: "unreachable", detail: "API Plex injoignable" };
    }
}

/** Les deux vérifications, en parallèle. Un serveur injoignable n'empêche pas le redémarrage (il est peut-être planté). */
export async function checkBeforeCut(): Promise<PlugCheck> {
    const [updates, playback] = await Promise.all([probeUpdates(), probePlayback()]);
    const blockers: PlugBlocker[] = [];
    const warnings: string[] = [];
    if (updates.state === "blocked") blockers.push({ kind: "update", detail: updates.detail });
    if (updates.state === "unreachable") warnings.push(`Mises à jour non vérifiables (${updates.detail}).`);
    if (playback.state === "blocked") blockers.push({ kind: "playback", detail: playback.detail });
    if (playback.state === "unreachable") warnings.push(`Lectures non vérifiables (${playback.detail}).`);
    return { blockers, warnings };
}

/* ── Actions ──────────────────────────────────────────────── */

const RESTART_DELAY_MS = 15_000;
let busy = false;

/** Coupe le courant, attend, le rétablit. La remise sous tension est tentée quoi qu'il arrive. */
export async function restartServer(force: boolean): Promise<PlugActionResult> {
    if (busy) return { ok: false, blocked: false, error: "Un redémarrage est déjà en cours." };
    busy = true;
    try {
        const check = await checkBeforeCut();
        if (check.blockers.length > 0 && !force) {
            return { ok: false, blocked: true, blockers: check.blockers, warnings: check.warnings };
        }

        await setSwitch(false);
        try {
            await new Promise((r) => setTimeout(r, RESTART_DELAY_MS));
        } finally {
            await setSwitch(true);
        }
        return {
            ok: true,
            message: "Courant coupé puis rétabli. Le serveur devrait redémarrer dans une à deux minutes.",
            warnings: check.warnings,
        };
    } catch (e) {
        // Si la coupure a eu lieu mais pas la remise sous tension, on retente une fois pour ne pas laisser la prise éteinte.
        try {
            await setSwitch(true);
        } catch {}
        return { ok: false, blocked: false, error: e instanceof Error ? e.message : "Erreur inconnue" };
    } finally {
        busy = false;
    }
}

/** Coupe le courant sans le rétablir, après les mêmes vérifications que le redémarrage. */
export async function plugOff(force: boolean): Promise<PlugActionResult> {
    if (busy) return { ok: false, blocked: false, error: "Une opération est déjà en cours." };
    busy = true;
    try {
        const check = await checkBeforeCut();
        if (check.blockers.length > 0 && !force) {
            return { ok: false, blocked: true, blockers: check.blockers, warnings: check.warnings };
        }
        await setSwitch(false);
        return { ok: true, message: "Prise éteinte : le serveur n'est plus alimenté.", warnings: check.warnings };
    } catch (e) {
        return { ok: false, blocked: false, error: e instanceof Error ? e.message : "Erreur inconnue" };
    } finally {
        busy = false;
    }
}

/** Rallume la prise (sans vérification : on ne coupe rien). */
export async function plugOn(): Promise<PlugActionResult> {
    try {
        await setSwitch(true);
        return { ok: true, message: "Prise allumée.", warnings: [] };
    } catch (e) {
        return { ok: false, blocked: false, error: e instanceof Error ? e.message : "Erreur inconnue" };
    }
}
