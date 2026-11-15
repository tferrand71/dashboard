/**
 * Gestion des fichiers du serveur Plex (envoi, liste, suppression), via Tailscale.
 *
 * Le dashboard ne touche jamais au disque du serveur : il parle à une « passerelle »
 * (media-gate.py côté serveur) par SSH, avec une clé dont la commande est forcée.
 * La passerelle n'accepte que quelques opérations, confinées aux dossiers film/ et serie/.
 * Les fichiers ne sont pas stockés sur le VPS : le corps de la requête est relayé en flux.
 */
import { Client } from "ssh2";
import type { Readable } from "node:stream";

export type RemoteItem = { name: string; dir: boolean; size: number | null; mtime: number };
export type RemoteRoot = { name: "film" | "serie"; free: number | null; total: number | null };

export type GateOk<T> = { ok: true } & T;
export type GateError = { ok: false; error: string; offset?: number };
export type GateReply<T> = GateOk<T> | GateError;

export function mediaConfigured(): boolean {
    return Boolean(process.env.PLUG_SSH_HOST && process.env.MEDIA_SSH_KEY_B64);
}

/* ── Connexion SSH partagée (une par processus, rouverte si elle tombe) ── */

let connection: Promise<Client> | null = null;

function dropConnection() {
    connection = null;
}

function getConnection(): Promise<Client> {
    if (connection) return connection;
    const host = process.env.PLUG_SSH_HOST;
    const keyB64 = process.env.MEDIA_SSH_KEY_B64;
    const pinned = process.env.PLUG_SSH_HOST_KEY_SHA256;
    if (!host || !keyB64) return Promise.reject(new Error("Accès au serveur Plex non configuré"));

    const p = new Promise<Client>((resolve, reject) => {
        const conn = new Client();
        conn.on("ready", () => resolve(conn));
        conn.on("error", (e) => {
            dropConnection();
            reject(e);
        });
        conn.on("close", dropConnection);
        conn.on("end", dropConnection);
        conn.connect({
            host,
            port: 22,
            username: process.env.PLUG_SSH_USER ?? "serveur",
            privateKey: Buffer.from(keyB64, "base64").toString("utf8"),
            readyTimeout: 10_000,
            keepaliveInterval: 15_000,
            hostHash: "sha256",
            hostVerifier: (fingerprintHex: string) => {
                if (!pinned) return true;
                const b64 = Buffer.from(fingerprintHex, "hex").toString("base64").replace(/=+$/, "");
                return b64 === pinned.replace(/^SHA256:/, "");
            },
        });
    });
    connection = p;
    p.catch(dropConnection);
    return p;
}

/* ── Appel d'une opération de la passerelle ───────────────── */

const CALL_TIMEOUT_MS = 120_000;

/**
 * Envoie une opération ; `body` (optionnel) est relayé tel quel sur l'entrée standard
 * de la passerelle (c'est ainsi que passent les octets d'un morceau de fichier).
 */
export async function gate<T extends object>(op: Record<string, unknown>, body?: Readable): Promise<GateReply<T>> {
    const conn = await getConnection();
    const command = "gate " + Buffer.from(JSON.stringify(op)).toString("base64");

    return new Promise((resolve, reject) => {
        let finished = false;
        const finish = (fn: () => void) => {
            if (finished) return;
            finished = true;
            clearTimeout(timer);
            fn();
        };
        const timer = setTimeout(() => {
            finish(() => reject(new Error("Le serveur Plex ne répond pas (délai dépassé)")));
        }, CALL_TIMEOUT_MS);

        conn.exec(command, (err, stream) => {
            if (err) {
                dropConnection();
                return finish(() => reject(new Error("Connexion au serveur Plex impossible")));
            }
            let out = "";
            stream.on("data", (d: Buffer) => (out += d.toString("utf8")));
            stream.stderr.on("data", () => {});
            stream.on("close", () => {
                finish(() => {
                    const last = out.trim().split("\n").pop() ?? "";
                    try {
                        resolve(JSON.parse(last) as GateReply<T>);
                    } catch {
                        reject(new Error("Réponse illisible du serveur Plex"));
                    }
                });
            });
            if (body) {
                // Si le navigateur coupe en cours de route, on ferme le canal : la passerelle
                // voit un morceau incomplet et revient à l'état d'avant (il pourra être renvoyé).
                body.on("error", () => stream.close());
                body.pipe(stream);
            } else {
                stream.end();
            }
        });
    });
}

/* ── Rafraîchir la bibliothèque Plex après un ajout ou une suppression ── */

export async function refreshPlexLibrary(root: "film" | "serie"): Promise<boolean> {
    const base = process.env.PLEX_URL?.replace(/\/$/, "");
    const token = process.env.PLEX_TOKEN;
    if (!base || !token) return false;
    const headers = { Accept: "application/json", "X-Plex-Token": token };
    try {
        const res = await fetch(`${base}/library/sections`, { headers, signal: AbortSignal.timeout(8_000), cache: "no-store" });
        if (!res.ok) return false;
        const json = (await res.json()) as { MediaContainer: { Directory?: { key: string; Location?: { path: string }[] }[] } };
        const section = json.MediaContainer.Directory?.find((d) => d.Location?.some((l) => l.path.endsWith(`/${root}`)));
        if (!section) return false;
        const r = await fetch(`${base}/library/sections/${section.key}/refresh`, {
            headers,
            signal: AbortSignal.timeout(8_000),
            cache: "no-store",
        });
        return r.ok;
    } catch {
        return false;
    }
}

/** Première partie d'un chemin « film/xxx » : la bibliothèque concernée. */
export function rootOf(path: string): "film" | "serie" | null {
    const first = path.split("/").find((p) => p !== "");
    return first === "film" || first === "serie" ? first : null;
}

/** Les actions sensibles ne sont acceptées que si elles viennent du dashboard lui-même. */
export function sameOrigin(request: Request): boolean {
    const origin = request.headers.get("origin");
    if (!origin) return true;
    try {
        return new URL(origin).host === request.headers.get("host");
    } catch {
        return false;
    }
}
