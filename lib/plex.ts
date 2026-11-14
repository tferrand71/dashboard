/**
 * Client minimal pour l'API Plex (serveur à la maison, joint via Tailscale).
 * Le serveur n'est pas toujours allumé : chaque appel a un timeout court et
 * ne lève jamais — on renvoie { online: false } plutôt que de planter une route.
 */

export type PlexOnDeckItem = {
    ratingKey: string;
    type: "movie" | "episode";
    title: string;
    showTitle: string | null;
    season: number | null;
    episode: number | null;
    viewOffsetMs: number;
    durationMs: number;
    percent: number;
};

export type PlexSession = {
    sessionKey: string;
    title: string;
    showTitle: string | null;
    userTitle: string;
    player: string;
    device: string;
    state: "playing" | "paused" | "buffering";
    transcoding: boolean;
    viewOffsetMs: number;
    durationMs: number;
    percent: number;
};

export type PlexAccount = {
    id: number;
    name: string;
    thumb: string | null;
};

export type PlexHistoryItem = {
    historyKey: string;
    type: "movie" | "episode";
    title: string;
    showTitle: string | null;
    season: number | null;
    episode: number | null;
    viewedAt: string; // ISO
    accountId: number;
    device: string | null;
};

export type PlexLibrarySummary = {
    movies: number;
    shows: number;
    episodes: number;
};

export type PlexOverview = {
    online: true;
    serverName: string;
    version: string;
    library: PlexLibrarySummary;
    onDeck: PlexOnDeckItem[];
    sessions: PlexSession[];
} | {
    online: false;
    reason: string;
};

function config(): { baseUrl: string; token: string } | null {
    const baseUrl = process.env.PLEX_URL;
    const token = process.env.PLEX_TOKEN;
    if (!baseUrl || !token) return null;
    return { baseUrl: baseUrl.replace(/\/$/, ""), token };
}

async function plexGet<T>(path: string, timeoutMs = 5000): Promise<T> {
    const cfg = config();
    if (!cfg) throw new Error("PLEX_URL / PLEX_TOKEN non configurés");

    const res = await fetch(`${cfg.baseUrl}${path}`, {
        headers: { Accept: "application/json", "X-Plex-Token": cfg.token },
        signal: AbortSignal.timeout(timeoutMs),
        cache: "no-store",
    });
    if (!res.ok) throw new Error(`Plex a répondu ${res.status}`);
    return (await res.json()) as T;
}

type MediaContainer<T> = { MediaContainer: T };

function msFromOffset(viewOffset?: number, duration?: number) {
    const viewOffsetMs = viewOffset ?? 0;
    const durationMs = duration ?? 0;
    const percent = durationMs > 0 ? Math.min(100, Math.round((viewOffsetMs / durationMs) * 100)) : 0;
    return { viewOffsetMs, durationMs, percent };
}

/** Vue d'ensemble : nécessite que le serveur soit joignable ; renvoie online:false sinon, sans jamais lever. */
export async function getPlexOverview(): Promise<PlexOverview> {
    const cfg = config();
    if (!cfg) return { online: false, reason: "PLEX_URL / PLEX_TOKEN non configurés sur le dashboard" };

    try {
        type Identity = { MediaContainer: { version: string; friendlyName?: string } };
        const identity = await plexGet<Identity>("/identity", 4000);

        type Sections = { MediaContainer: { Directory: { key: string; type: string }[] } };
        const sections = await plexGet<Sections>("/library/sections", 5000);

        let movies = 0;
        let shows = 0;
        let episodes = 0;
        for (const dir of sections.MediaContainer.Directory) {
            if (dir.type === "movie") {
                const r = await plexGet<MediaContainer<{ totalSize?: number; size?: number }>>(
                    `/library/sections/${dir.key}/all?X-Plex-Container-Size=0`,
                );
                movies += r.MediaContainer.totalSize ?? r.MediaContainer.size ?? 0;
            } else if (dir.type === "show") {
                const [showsRes, episodesRes] = await Promise.all([
                    plexGet<MediaContainer<{ totalSize?: number; size?: number }>>(
                        `/library/sections/${dir.key}/all?X-Plex-Container-Size=0&type=2`,
                    ),
                    plexGet<MediaContainer<{ totalSize?: number; size?: number }>>(
                        `/library/sections/${dir.key}/all?X-Plex-Container-Size=0&type=4`,
                    ),
                ]);
                shows += showsRes.MediaContainer.totalSize ?? showsRes.MediaContainer.size ?? 0;
                episodes += episodesRes.MediaContainer.totalSize ?? episodesRes.MediaContainer.size ?? 0;
            }
        }

        type OnDeckMeta = {
            ratingKey: string;
            type: "movie" | "episode";
            title: string;
            grandparentTitle?: string;
            parentIndex?: number;
            index?: number;
            viewOffset?: number;
            duration?: number;
        };
        const onDeckRes = await plexGet<MediaContainer<{ Metadata?: OnDeckMeta[] }>>("/library/onDeck", 5000);
        const onDeck: PlexOnDeckItem[] = (onDeckRes.MediaContainer.Metadata ?? []).map((m) => ({
            ratingKey: m.ratingKey,
            type: m.type,
            title: m.title,
            showTitle: m.grandparentTitle ?? null,
            season: m.parentIndex ?? null,
            episode: m.index ?? null,
            ...msFromOffset(m.viewOffset, m.duration),
        }));

        type SessionMeta = {
            sessionKey: string;
            title: string;
            grandparentTitle?: string;
            viewOffset?: number;
            duration?: number;
            User?: { title?: string };
            Player?: { title?: string; device?: string; state?: string };
            TranscodeSession?: unknown;
        };
        const sessionsRes = await plexGet<MediaContainer<{ Metadata?: SessionMeta[] }>>("/status/sessions", 5000);
        const sessions: PlexSession[] = (sessionsRes.MediaContainer.Metadata ?? []).map((m) => ({
            sessionKey: m.sessionKey,
            title: m.title,
            showTitle: m.grandparentTitle ?? null,
            userTitle: m.User?.title ?? "Inconnu",
            player: m.Player?.title ?? "Appareil inconnu",
            device: m.Player?.device ?? "",
            state: (m.Player?.state as PlexSession["state"]) ?? "playing",
            transcoding: Boolean(m.TranscodeSession),
            ...msFromOffset(m.viewOffset, m.duration),
        }));

        return {
            online: true,
            serverName: identity.MediaContainer.friendlyName ?? "Plex",
            version: identity.MediaContainer.version,
            library: { movies, shows, episodes },
            onDeck,
            sessions,
        };
    } catch {
        return { online: false, reason: "Serveur Plex injoignable (éteint, ou hors du réseau Tailscale)" };
    }
}

/** Comptes Plex Home du serveur, pour le sélecteur d'historique. null si le serveur est hors ligne. */
export async function getPlexAccounts(): Promise<PlexAccount[] | null> {
    try {
        type AccountMeta = { id: number; name: string; thumb?: string };
        const res = await plexGet<MediaContainer<{ Account?: AccountMeta[] }>>("/accounts", 4000);
        return (res.MediaContainer.Account ?? [])
            .filter((a) => a.name)
            .map((a) => ({ id: a.id, name: a.name, thumb: a.thumb ?? null }));
    } catch {
        return null;
    }
}

/** Historique de lecture, filtré par compte. null si le serveur est hors ligne. */
export async function getPlexHistory(accountId: number, limit = 20): Promise<PlexHistoryItem[] | null> {
    try {
        type HistoryMeta = {
            historyKey: string;
            type: "movie" | "episode";
            title: string;
            grandparentTitle?: string;
            parentIndex?: number;
            index?: number;
            viewedAt: number;
            accountID: number;
            device?: string;
        };
        const res = await plexGet<MediaContainer<{ Metadata?: HistoryMeta[] }>>(
            `/status/sessions/history/all?accountID=${accountId}&sort=viewedAt:desc&X-Plex-Container-Size=${limit}`,
            5000,
        );
        return (res.MediaContainer.Metadata ?? []).map((m) => ({
            historyKey: m.historyKey,
            type: m.type,
            title: m.title,
            showTitle: m.grandparentTitle ?? null,
            season: m.parentIndex ?? null,
            episode: m.index ?? null,
            viewedAt: new Date(m.viewedAt * 1000).toISOString(),
            accountId: m.accountID,
            device: m.device ?? null,
        }));
    } catch {
        return null;
    }
}
