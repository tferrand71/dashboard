"use client";

import { useEffect, useMemo, useState } from "react";
import { Clapperboard, Film, Tv, WifiOff } from "lucide-react";
import type { PlexAccount, PlexHistoryItem, PlexOnDeckItem, PlexOverview, PlexSession } from "@/lib/plex";
import { formatDuration, timeAgo } from "@/lib/format";
import { Badge, EmptyState, ErrorBanner, LiveIndicator, Meter, Panel, Skeleton } from "../../_components/ui";
import { usePoll } from "../../_components/use-poll";

function initials(name: string): string {
    return name
        .split(/\s+/)
        .map((p) => p[0])
        .join("")
        .slice(0, 2)
        .toUpperCase();
}

function episodeLabel(season: number | null, episode: number | null): string | null {
    if (season === null || episode === null) return null;
    return `S${String(season).padStart(2, "0")}E${String(episode).padStart(2, "0")}`;
}

/* ── Hors ligne : même vocabulaire que les autres onglets (deploy-agent injoignable, etc.) ── */
function PlexOffline({ reason }: { reason: string }) {
    return (
        <Panel title="Plex">
            <EmptyState icon={WifiOff} title="Serveur Plex hors ligne">
                {reason} — rien d&rsquo;autre dans le dashboard n&rsquo;en dépend, réessaie quand il sera allumé.
            </EmptyState>
        </Panel>
    );
}

function StatTile({ icon: Icon, value, label }: { icon: typeof Film; value: string; label: string }) {
    return (
        <div className="card p-4">
            <span className="mb-2.5 inline-flex h-[30px] w-[30px] items-center justify-center rounded-lg bg-accent/12 text-accent-fg">
                <Icon className="h-4 w-4" strokeWidth={1.75} />
            </span>
            <div className="font-mono text-2xl font-semibold tabular">{value}</div>
            <div className="mt-0.5 text-[12.5px] text-fg-muted">{label}</div>
        </div>
    );
}

function OnDeckRow({ item }: { item: PlexOnDeckItem }) {
    const ep = episodeLabel(item.season, item.episode);
    return (
        <div className="flex items-center gap-3 border-b border-line px-4 py-3 last:border-b-0">
            <div
                className="flex h-[52px] w-9 shrink-0 items-center justify-center rounded-md border border-line-strong font-display text-sm font-semibold text-white/90"
                style={{ background: "linear-gradient(160deg, var(--color-accent), var(--color-surface))" }}
            >
                {initials(item.showTitle ?? item.title)}
            </div>
            <div className="min-w-0 flex-1">
                <p className="truncate text-[13.5px] font-medium">{item.showTitle ?? item.title}</p>
                <p className="truncate text-xs text-fg-subtle">
                    {item.showTitle ? `${ep ? `${ep} · ` : ""}${item.title}` : `Film · ${formatDuration(Math.round(item.durationMs / 1000))}`}
                </p>
                <div className="mt-1.5 flex items-center gap-2">
                    <Meter percent={item.percent} tone="ok" />
                    <span className="w-8 shrink-0 text-right text-[11px] tabular text-fg-subtle">{item.percent}%</span>
                </div>
            </div>
            <Badge tone="neutral">
                {item.type === "movie" ? <Film className="h-[11px] w-[11px]" /> : <Tv className="h-[11px] w-[11px]" />}
                {item.type === "movie" ? "Film" : "Série"}
            </Badge>
        </div>
    );
}

function SessionRow({ session }: { session: PlexSession }) {
    const remainingSec = Math.max(0, Math.round((session.durationMs - session.viewOffsetMs) / 1000));
    return (
        <div className="flex items-center gap-3.5 border-b border-line px-4 py-3.5 last:border-b-0">
            <span className="flex h-[34px] w-[34px] shrink-0 items-center justify-center rounded-lg bg-accent/12 text-accent-fg">
                <Clapperboard className="h-4 w-4" />
            </span>
            <div className="min-w-0 flex-1">
                <p className="truncate text-[13px] font-medium">{session.showTitle ?? session.title}</p>
                <p className="truncate text-xs text-fg-subtle">
                    {session.userTitle} · {session.player}
                    {session.transcoding ? " · Transcodage" : " · Lecture directe"}
                </p>
                <div className="mt-1.5">
                    <Meter percent={session.percent} tone={session.transcoding ? "warn" : "ok"} />
                </div>
            </div>
            <div className="shrink-0 text-right text-xs text-fg-subtle">
                <b className="block text-[13px] font-medium text-fg tabular">{session.percent}%</b>
                {formatDuration(remainingSec)} restant
            </div>
        </div>
    );
}

function HistoryRow({ item }: { item: PlexHistoryItem }) {
    const ep = episodeLabel(item.season, item.episode);
    return (
        <div className="flex items-center gap-3 border-b border-line px-4 py-2.5 last:border-b-0">
            <div className="flex h-12 w-[34px] shrink-0 items-center justify-center rounded-md border border-line-strong text-xs font-semibold text-white/90">
                {initials(item.showTitle ?? item.title)}
            </div>
            <div className="min-w-0 flex-1">
                <p className="truncate text-[13px] font-medium">{item.showTitle ?? item.title}</p>
                <p className="truncate text-[11.5px] text-fg-subtle">
                    {item.type === "movie" ? "Film" : ep ?? "Épisode"}
                    {item.device ? ` · ${item.device}` : ""}
                </p>
            </div>
            <div className="shrink-0 text-right text-[11.5px] text-fg-subtle">{timeAgo(item.viewedAt)}</div>
        </div>
    );
}

function HistorySection() {
    const [accounts, setAccounts] = useState<PlexAccount[] | null>(null);
    const [selected, setSelected] = useState<number | null>(null);
    const [history, setHistory] = useState<PlexHistoryItem[] | null>(null);
    const [loadingHistory, setLoadingHistory] = useState(false);

    useEffect(() => {
        let cancelled = false;
        fetch("/api/plex/users", { cache: "no-store" })
            .then((r) => (r.ok ? r.json() : Promise.reject()))
            .then((json: { accounts: PlexAccount[] }) => {
                if (cancelled) return;
                setAccounts(json.accounts);
                if (json.accounts.length > 0) setSelected(json.accounts[0].id);
            })
            .catch(() => {
                if (!cancelled) setAccounts([]);
            });
        return () => {
            cancelled = true;
        };
    }, []);

    useEffect(() => {
        if (selected === null) return;
        let cancelled = false;
        // setState hors du corps de l'effet (règle react-hooks/set-state-in-effect), cf. use-poll.ts
        const markLoading = setTimeout(() => setLoadingHistory(true), 0);
        fetch(`/api/plex/history?accountId=${selected}`, { cache: "no-store" })
            .then((r) => (r.ok ? r.json() : Promise.reject()))
            .then((json: { history: PlexHistoryItem[] }) => {
                if (!cancelled) setHistory(json.history);
            })
            .catch(() => {
                if (!cancelled) setHistory(null);
            })
            .finally(() => {
                if (!cancelled) setLoadingHistory(false);
            });
        return () => {
            cancelled = true;
            clearTimeout(markLoading);
        };
    }, [selected]);

    return (
        <Panel title="Historique par utilisateur" description="Lectures récentes, par profil Plex Home">
            {accounts === null && (
                <div className="flex gap-2 px-4 py-3">
                    <Skeleton className="h-7 w-20" />
                    <Skeleton className="h-7 w-20" />
                    <Skeleton className="h-7 w-20" />
                </div>
            )}
            {accounts?.length === 0 && (
                <EmptyState icon={Film} title="Aucun profil trouvé">
                    Le serveur n&rsquo;expose aucun compte Plex Home, ou est hors ligne.
                </EmptyState>
            )}
            {accounts && accounts.length > 0 && (
                <>
                    <div className="flex gap-1.5 overflow-x-auto px-3 py-2.5" role="tablist">
                        {accounts.map((a) => (
                            <button
                                key={a.id}
                                type="button"
                                role="tab"
                                aria-selected={selected === a.id}
                                onClick={() => setSelected(a.id)}
                                className={`flex shrink-0 items-center gap-2 rounded-full border px-3 py-1.5 text-[12.5px] font-medium transition-colors ${
                                    selected === a.id
                                        ? "border-transparent bg-gradient-to-b from-accent to-accent-hover text-white"
                                        : "border-line-strong bg-elevated text-fg-muted hover:border-accent/40 hover:text-fg"
                                }`}
                            >
                                <span className="flex h-[22px] w-[22px] items-center justify-center rounded-full bg-black/20 text-[10.5px] font-semibold">
                                    {initials(a.name)}
                                </span>
                                {a.name}
                            </button>
                        ))}
                    </div>
                    <div>
                        {loadingHistory && (
                            <div className="space-y-2 px-4 py-3">
                                <Skeleton className="h-10 w-full" />
                                <Skeleton className="h-10 w-full" />
                            </div>
                        )}
                        {!loadingHistory && history === null && (
                            <ErrorBanner>Historique injoignable pour ce profil.</ErrorBanner>
                        )}
                        {!loadingHistory && history?.length === 0 && (
                            <EmptyState icon={Film} title="Aucune lecture récente">
                                Rien dans l&rsquo;historique de ce profil pour l&rsquo;instant.
                            </EmptyState>
                        )}
                        {!loadingHistory && history && history.length > 0 && history.map((h) => <HistoryRow key={h.historyKey} item={h} />)}
                    </div>
                </>
            )}
        </Panel>
    );
}

export function PlexPanel() {
    const { data, error, updatedAt } = usePoll<PlexOverview>("/api/plex/overview", 30_000, undefined, "Plex injoignable");

    const offline = data && !data.online;
    const online = data && data.online ? data : null;

    const library = useMemo(() => online?.library ?? null, [online]);

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-end">
                <LiveIndicator updatedAt={updatedAt} error={error ?? (offline ? "Plex hors ligne" : null)} />
            </div>

            {!data && (
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                    <Skeleton className="h-24" />
                    <Skeleton className="h-24" />
                    <Skeleton className="h-24" />
                </div>
            )}

            {offline && <PlexOffline reason={!data.online ? data.reason : ""} />}

            {online && (
                <>
                    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                        <StatTile icon={Film} value={String(library?.movies ?? 0)} label="Films" />
                        <StatTile icon={Tv} value={String(library?.shows ?? 0)} label="Séries" />
                        <StatTile icon={Clapperboard} value={String(library?.episodes ?? 0)} label="Épisodes" />
                    </div>

                    <div className="grid gap-4 lg:grid-cols-[1.6fr_1fr]">
                        <Panel title="Reprendre la lecture" description="Avancement par film ou épisode en cours" bodyClassName="">
                            {online.onDeck.length === 0 ? (
                                <EmptyState icon={Film} title="Rien en cours">
                                    Aucune lecture inachevée pour l&rsquo;instant.
                                </EmptyState>
                            ) : (
                                online.onDeck.map((item) => <OnDeckRow key={item.ratingKey} item={item} />)
                            )}
                        </Panel>

                        <Panel
                            title="Lecture en cours"
                            description="Appareils connectés en ce moment"
                            actions={
                                online.sessions.length > 0 ? (
                                    <Badge tone="ok" dot>
                                        {online.sessions.length} active{online.sessions.length > 1 ? "s" : ""}
                                    </Badge>
                                ) : undefined
                            }
                        >
                            {online.sessions.length === 0 ? (
                                <EmptyState icon={WifiOff} title="Personne ne regarde">
                                    Aucune session active sur le serveur.
                                </EmptyState>
                            ) : (
                                online.sessions.map((s) => <SessionRow key={s.sessionKey} session={s} />)
                            )}
                        </Panel>
                    </div>

                    <HistorySection />
                </>
            )}
        </div>
    );
}
