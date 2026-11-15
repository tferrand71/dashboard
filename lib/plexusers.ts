/**
 * Gestion des utilisateurs du serveur Plex depuis le dashboard.
 *
 * Plex ne documente pas d'API pour ça : on utilise les routes historiques de plex.tv avec
 * le jeton du propriétaire (PLEX_TOKEN). Les routes « amis » modernes (v2/friends) sont
 * retirées (410) ; seules les anciennes routes XML répondent encore, d'où le mini-analyseur XML.
 *
 * Trois types de membres :
 *  - admin  : le propriétaire du compte (jamais modifiable ici) ;
 *  - home   : profil du Plex Home, géré, sans compte Plex (ex. « maman ») ;
 *  - friend : ami invité, qui a son propre compte Plex.
 *
 * Le type d'un membre est TOUJOURS relu côté serveur à partir de plex.tv : le navigateur n'envoie
 * qu'un identifiant, ce qui l'empêche de se faire passer pour un autre type ou de viser l'admin.
 */

export type MemberKind = "admin" | "home" | "friend";

export type Member = {
    id: string;
    name: string;
    kind: MemberKind;
    /** Profil du Home restreint (enfant / géré). */
    restricted: boolean;
    /** Protégé par un code PIN. */
    protectedByPin: boolean;
    /** Identifiants (plex.tv) des bibliothèques auxquelles il a accès. */
    libraryIds: string[];
};

export type Library = { id: string; title: string; type: string };

export type MembersResult = { ok: true; members: Member[]; libraries: Library[] } | { ok: false; error: string };
export type ActionResult = { ok: true; message: string } | { ok: false; error: string };

/* ── Mini-analyseur XML (uniquement ce dont plex.tv a besoin) ── */

type XNode = { tag: string; attrs: Record<string, string>; children: XNode[] };

const ENTITIES: Record<string, string> = { amp: "&", lt: "<", gt: ">", quot: '"', apos: "'" };
function decode(s: string): string {
    return s.replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (m, e: string) => {
        if (e[0] === "#") {
            const code = e[1] === "x" || e[1] === "X" ? parseInt(e.slice(2), 16) : parseInt(e.slice(1), 10);
            return Number.isFinite(code) ? String.fromCodePoint(code) : m;
        }
        return ENTITIES[e.toLowerCase()] ?? m;
    });
}

function parseXml(xml: string): XNode {
    const root: XNode = { tag: "#root", attrs: {}, children: [] };
    const stack: XNode[] = [root];
    const tagRe = /<(\/?)([A-Za-z_][\w:.-]*)((?:\s+[\w:.-]+\s*=\s*(?:"[^"]*"|'[^']*'))*)\s*(\/?)>/g;
    const attrRe = /([\w:.-]+)\s*=\s*(?:"([^"]*)"|'([^']*)')/g;
    for (const m of xml.matchAll(tagRe)) {
        if (m[1] === "/") {
            if (stack.length > 1) stack.pop();
            continue;
        }
        const attrs: Record<string, string> = {};
        for (const a of m[3].matchAll(attrRe)) attrs[a[1]] = decode(a[2] ?? a[3] ?? "");
        const node: XNode = { tag: m[2], attrs, children: [] };
        stack[stack.length - 1].children.push(node);
        if (m[4] !== "/") stack.push(node);
    }
    return root;
}

function all(node: XNode, tag: string): XNode[] {
    const out: XNode[] = [];
    const walk = (n: XNode) => {
        for (const c of n.children) {
            if (c.tag === tag) out.push(c);
            walk(c);
        }
    };
    walk(node);
    return out;
}

/* ── Appels plex.tv ───────────────────────────────────────── */

export function plexUsersConfigured(): boolean {
    return Boolean(process.env.PLEX_URL && process.env.PLEX_TOKEN);
}

async function tv(method: "GET" | "POST" | "PUT" | "DELETE", path: string, body?: unknown): Promise<{ status: number; text: string }> {
    const token = process.env.PLEX_TOKEN;
    if (!token) throw new Error("PLEX_TOKEN non configuré");
    const res = await fetch(`https://plex.tv${path}`, {
        method,
        headers: {
            "X-Plex-Token": token,
            "X-Plex-Client-Identifier": "dashboard-vps",
            "X-Plex-Product": "Dashboard",
            Accept: "application/xml",
            ...(body !== undefined ? { "Content-Type": "application/json" } : {}),
        },
        body: body !== undefined ? JSON.stringify(body) : undefined,
        signal: AbortSignal.timeout(20_000),
        cache: "no-store",
    });
    return { status: res.status, text: await res.text() };
}

const okStatus = (s: number) => s >= 200 && s < 300;

/** Message d'erreur lisible tiré d'une réponse plex.tv (XML ou JSON), sans balises. */
function tvError(r: { status: number; text: string }): string {
    const m = r.text.match(/<error[^>]*>([^<]+)<\/error>/i) ?? r.text.match(/"message"\s*:\s*"([^"]+)"/);
    const detail = m ? decode(m[1]).trim() : "";
    return detail ? `${detail} (plex.tv ${r.status})` : `plex.tv a refusé la demande (code ${r.status})`;
}

let machineIdCache: string | null = null;
async function machineId(): Promise<string> {
    if (machineIdCache) return machineIdCache;
    const base = process.env.PLEX_URL?.replace(/\/$/, "");
    const token = process.env.PLEX_TOKEN;
    if (!base || !token) throw new Error("Plex non configuré");
    const res = await fetch(`${base}/identity`, {
        headers: { Accept: "application/json", "X-Plex-Token": token },
        signal: AbortSignal.timeout(8_000),
        cache: "no-store",
    });
    if (!res.ok) throw new Error("Le serveur Plex ne répond pas (il est peut-être éteint)");
    const id = ((await res.json()) as { MediaContainer: { machineIdentifier?: string } }).MediaContainer.machineIdentifier;
    if (!id) throw new Error("Identifiant du serveur Plex introuvable");
    machineIdCache = id;
    return id;
}

/* ── Lecture ──────────────────────────────────────────────── */

async function loadLibraries(mid: string): Promise<Library[]> {
    const r = await tv("GET", `/api/servers/${mid}`);
    if (!okStatus(r.status)) throw new Error(tvError(r));
    return all(parseXml(r.text), "Section").map((s) => ({ id: s.attrs.id, title: s.attrs.title, type: s.attrs.type ?? "" }));
}

type SharedServer = { id: string; userId: string; libraryIds: string[] };

async function loadShares(mid: string): Promise<SharedServer[]> {
    const r = await tv("GET", `/api/servers/${mid}/shared_servers`);
    if (!okStatus(r.status)) throw new Error(tvError(r));
    return all(parseXml(r.text), "SharedServer").map((s) => ({
        id: s.attrs.id,
        userId: s.attrs.userID,
        libraryIds: all(s, "Section")
            .filter((x) => x.attrs.shared === "1")
            .map((x) => x.attrs.id),
    }));
}

async function loadMembers(mid: string): Promise<{ members: Member[]; shares: SharedServer[] }> {
    const [home, users, shares] = await Promise.all([
        tv("GET", "/api/home/users"),
        tv("GET", "/api/users"),
        loadShares(mid),
    ]);
    if (!okStatus(home.status)) throw new Error(tvError(home));
    if (!okStatus(users.status)) throw new Error(tvError(users));

    const byUser = new Map(shares.map((s) => [s.userId, s]));
    const members = new Map<string, Member>();

    for (const u of all(parseXml(home.text), "User")) {
        const admin = u.attrs.admin === "1";
        members.set(u.attrs.id, {
            id: u.attrs.id,
            name: u.attrs.title || u.attrs.username || "Sans nom",
            kind: admin ? "admin" : "home",
            restricted: u.attrs.restricted === "1",
            protectedByPin: u.attrs.protected === "1",
            // L'administrateur voit tout : on n'affiche pas de liste de partage pour lui.
            libraryIds: admin ? [] : (byUser.get(u.attrs.id)?.libraryIds ?? []),
        });
    }
    for (const u of all(parseXml(users.text), "User")) {
        if (members.has(u.attrs.id)) continue;
        members.set(u.attrs.id, {
            id: u.attrs.id,
            name: u.attrs.title || u.attrs.username || "Sans nom",
            kind: u.attrs.home === "1" ? "home" : "friend",
            restricted: u.attrs.restricted === "1",
            protectedByPin: u.attrs.protected === "1",
            libraryIds: byUser.get(u.attrs.id)?.libraryIds ?? [],
        });
    }
    const rank: Record<MemberKind, number> = { admin: 0, home: 1, friend: 2 };
    const list = [...members.values()].sort((a, b) => rank[a.kind] - rank[b.kind] || a.name.localeCompare(b.name, "fr"));
    return { members: list, shares };
}

export async function listMembers(): Promise<MembersResult> {
    try {
        const mid = await machineId();
        const [libraries, { members }] = await Promise.all([loadLibraries(mid), loadMembers(mid)]);
        return { ok: true, members, libraries };
    } catch (e) {
        return { ok: false, error: e instanceof Error ? e.message : "plex.tv injoignable" };
    }
}

/* ── Validation ───────────────────────────────────────────── */

/** Ne garde que des identifiants de bibliothèques qui existent réellement (jamais ce que dit le navigateur). */
function checkLibraries(requested: unknown, known: Library[]): string[] | null {
    if (!Array.isArray(requested)) return null;
    const ids = [...new Set(requested.map(String))];
    return ids.every((id) => known.some((l) => l.id === id)) ? ids : null;
}

const EMAIL = /^[^\s@<>"']+@[^\s@<>"']+\.[^\s@<>"']{2,}$/;
const PSEUDO = /^[\p{L}\p{N}_.-]{2,64}$/u;
const PROFILE_NAME = /^[\p{L}\p{N}][\p{L}\p{N} _.'-]{0,29}$/u;

/* ── Écriture ─────────────────────────────────────────────── */

async function share(mid: string, who: { invited_id: number } | { invited_email: string }, libraryIds: string[]) {
    return tv("POST", `/api/servers/${mid}/shared_servers`, {
        server_id: mid,
        shared_server: { library_section_ids: libraryIds.map(Number), ...who },
    });
}

/** Invite un ami (compte Plex existant) par e-mail ou pseudo : Plex lui envoie une invitation. */
export async function inviteFriend(identifier: unknown, libraryIds: unknown): Promise<ActionResult> {
    try {
        const who = typeof identifier === "string" ? identifier.trim() : "";
        if (!EMAIL.test(who) && !PSEUDO.test(who)) return { ok: false, error: "Saisis une adresse e-mail ou un pseudo Plex valide." };
        const mid = await machineId();
        const libs = checkLibraries(libraryIds, await loadLibraries(mid));
        if (!libs || libs.length === 0) return { ok: false, error: "Choisis au moins une bibliothèque." };

        const r = await share(mid, { invited_email: who }, libs);
        if (!okStatus(r.status)) return { ok: false, error: tvError(r) };
        return { ok: true, message: `Invitation envoyée à ${who}. L'accès sera actif dès qu'elle l'aura acceptée.` };
    } catch (e) {
        return { ok: false, error: e instanceof Error ? e.message : "plex.tv injoignable" };
    }
}

/** Crée un profil du Plex Home (sans compte Plex) et lui donne accès aux bibliothèques choisies. */
export async function createHomeProfile(name: unknown, libraryIds: unknown): Promise<ActionResult> {
    try {
        const title = typeof name === "string" ? name.trim() : "";
        if (!PROFILE_NAME.test(title)) {
            return { ok: false, error: "Nom invalide : 1 à 30 caractères (lettres, chiffres, espaces, - _ . ')." };
        }
        const mid = await machineId();
        const libs = checkLibraries(libraryIds, await loadLibraries(mid));
        if (!libs || libs.length === 0) return { ok: false, error: "Choisis au moins une bibliothèque." };

        const existing = (await loadMembers(mid)).members;
        if (existing.some((m) => m.name.toLowerCase() === title.toLowerCase())) {
            return { ok: false, error: "Un utilisateur porte déjà ce nom." };
        }

        const created = await tv("POST", `/api/home/users?title=${encodeURIComponent(title)}`);
        if (!okStatus(created.status)) return { ok: false, error: tvError(created) };
        const id = parseXml(created.text).children.find((c) => c.tag === "user")?.attrs.id;
        if (!id) return { ok: false, error: "Profil créé mais identifiant introuvable : vérifie la liste." };

        const r = await share(mid, { invited_id: Number(id) }, libs);
        if (!okStatus(r.status)) {
            // Pas de profil à moitié créé : on annule ce qu'on vient de créer.
            await tv("DELETE", `/api/home/users/${id}`);
            return { ok: false, error: `Création annulée : ${tvError(r)}` };
        }
        return { ok: true, message: `Profil « ${title} » créé.` };
    } catch (e) {
        return { ok: false, error: e instanceof Error ? e.message : "plex.tv injoignable" };
    }
}

/** Remplace les bibliothèques accessibles. Liste vide = retrait de l'accès au serveur. */
export async function setLibraries(userId: unknown, libraryIds: unknown): Promise<ActionResult> {
    try {
        const mid = await machineId();
        const [libraries, { members, shares }] = await Promise.all([loadLibraries(mid), loadMembers(mid)]);
        const member = members.find((m) => m.id === String(userId));
        if (!member) return { ok: false, error: "Utilisateur introuvable." };
        if (member.kind === "admin") return { ok: false, error: "Le compte administrateur ne se modifie pas ici." };
        const libs = checkLibraries(libraryIds, libraries);
        if (!libs) return { ok: false, error: "Bibliothèque inconnue." };

        const current = shares.find((s) => s.userId === member.id);
        if (libs.length === 0) {
            if (!current) return { ok: true, message: `${member.name} n'avait déjà aucun accès.` };
            const r = await tv("DELETE", `/api/servers/${mid}/shared_servers/${current.id}`);
            return okStatus(r.status) ? { ok: true, message: `Accès de ${member.name} retiré.` } : { ok: false, error: tvError(r) };
        }
        const r = current
            ? await tv("PUT", `/api/servers/${mid}/shared_servers/${current.id}`, {
                  server_id: mid,
                  shared_server: { library_section_ids: libs.map(Number) },
              })
            : await share(mid, { invited_id: Number(member.id) }, libs);
        return okStatus(r.status) ? { ok: true, message: `Accès de ${member.name} mis à jour.` } : { ok: false, error: tvError(r) };
    } catch (e) {
        return { ok: false, error: e instanceof Error ? e.message : "plex.tv injoignable" };
    }
}

/**
 * Supprime un membre.
 *  - profil du Home : supprimé (son historique et ses notes disparaissent) ;
 *  - ami : accès au serveur retiré, puis retiré de la liste d'amis (cette dernière étape est signalée à part si elle échoue).
 */
export async function removeMember(userId: unknown): Promise<ActionResult> {
    try {
        const mid = await machineId();
        const { members, shares } = await loadMembers(mid);
        const member = members.find((m) => m.id === String(userId));
        if (!member) return { ok: false, error: "Utilisateur introuvable." };
        if (member.kind === "admin") return { ok: false, error: "Le compte administrateur ne peut pas être supprimé." };

        if (member.kind === "home") {
            const r = await tv("DELETE", `/api/home/users/${member.id}`);
            return okStatus(r.status) ? { ok: true, message: `Profil « ${member.name} » supprimé.` } : { ok: false, error: tvError(r) };
        }

        const current = shares.find((s) => s.userId === member.id);
        if (current) {
            const r = await tv("DELETE", `/api/servers/${mid}/shared_servers/${current.id}`);
            if (!okStatus(r.status)) return { ok: false, error: tvError(r) };
        }
        const f = await tv("DELETE", `/api/friends/${member.id}`);
        return okStatus(f.status)
            ? { ok: true, message: `${member.name} n'a plus accès au serveur et a été retiré de tes amis.` }
            : {
                  ok: true,
                  message: `Accès de ${member.name} retiré. Il reste dans ta liste d'amis Plex (suppression refusée : ${tvError(f)}).`,
              };
    } catch (e) {
        return { ok: false, error: e instanceof Error ? e.message : "plex.tv injoignable" };
    }
}
