"use client";

import { useState } from "react";
import { CalendarClock, History, Loader2, Repeat, X } from "lucide-react";
import {
    type CronState,
    type HistoryEntry,
    type Schedule,
    describeRecurrence,
    formatIn,
    formatWhen,
    outcomeTone,
    scheduleTime,
} from "@/lib/cron";
import { formatDuration } from "@/lib/format";
import { Badge, EmptyState, ErrorBanner, Panel, Skeleton, StatusDot } from "../../_components/ui";

const HISTORY_SHOWN = 8;

/**
 * Déploiements programmés par deploy-cron : ce qui est prévu (avec annulation), l'exécution en cours,
 * puis le résultat des derniers déploiements programmés. `onChanged` recharge l'état après une annulation.
 */
export function ScheduledDeploys({
    state,
    error,
    onChanged,
}: {
    state: CronState | null;
    error: string | null;
    onChanged: () => void;
}) {
    // L'heure de référence vient du serveur (state.now) : le décompte reste cohérent même si l'horloge
    // du navigateur est décalée, et le rendu reste pur (pas de Date.now() pendant l'affichage).
    const now = state ? Date.parse(state.now) : 0;

    return (
        <div className="space-y-4">
            <Panel title="Déploiements programmés" description="Lancés automatiquement par deploy-cron, heures de Paris">
                {error && !state ? (
                    <div className="p-4">
                        <ErrorBanner>Impossible de joindre deploy-cron.</ErrorBanner>
                    </div>
                ) : !state ? (
                    <div className="space-y-3 p-4">
                        <Skeleton className="h-10 w-full" />
                        <Skeleton className="h-10 w-full" />
                    </div>
                ) : (
                    <>
                        {error && (
                            <div className="border-b border-line p-4">
                                <ErrorBanner>
                                    deploy-cron ne répond plus : les informations ci-dessous peuvent être périmées.
                                </ErrorBanner>
                            </div>
                        )}
                        {!state.daemon.alive && (
                            <div className="border-b border-line p-4">
                                <ErrorBanner>
                                    Le planificateur deploy-cron ne répond plus : rien ne sera déployé à l&apos;heure
                                    prévue tant qu&apos;il n&apos;est pas relancé.
                                </ErrorBanner>
                            </div>
                        )}
                        {state.running && (
                            <div className="flex items-center gap-2 border-b border-line bg-info/5 px-4 py-2.5 text-[13px] text-info">
                                <StatusDot tone="info" pulse />
                                Déploiement en cours : <span className="font-medium">{state.running.project}</span>
                                <span className="text-fg-subtle">depuis {formatWhen(state.running.startedAt, state.timezone)}</span>
                            </div>
                        )}
                        {state.schedules.length === 0 ? (
                            <EmptyState icon={CalendarClock} title="Aucun déploiement programmé">
                                Utilise l&apos;icône horloge d&apos;un projet pour programmer un déploiement, par exemple cette
                                nuit à 3 h.
                            </EmptyState>
                        ) : (
                            <ul className="divide-y divide-line">
                                {state.schedules.map((s) => (
                                    <ScheduleRow
                                        key={s.id}
                                        schedule={s}
                                        now={now}
                                        timezone={state.timezone}
                                        running={state.running?.id === s.id}
                                        onCancelled={onChanged}
                                    />
                                ))}
                            </ul>
                        )}
                    </>
                )}
            </Panel>

            {state && state.history.length > 0 && (
                <Panel title="Derniers déploiements programmés" description="Résultat de chaque exécution">
                    <ul className="divide-y divide-line">
                        {state.history.slice(0, HISTORY_SHOWN).map((h) => (
                            <HistoryRow key={`${h.scheduleId}-${h.at}`} entry={h} timezone={state.timezone} />
                        ))}
                    </ul>
                </Panel>
            )}
        </div>
    );
}

function ScheduleRow({
    schedule: s,
    now,
    timezone,
    running,
    onCancelled,
}: {
    schedule: Schedule;
    now: number;
    timezone: string;
    running: boolean;
    onCancelled: () => void;
}) {
    const at = scheduleTime(s);
    const recurring = s.kind === "cron";
    const Icon = recurring ? Repeat : CalendarClock;

    return (
        <li className="flex flex-wrap items-center gap-x-4 gap-y-2 px-4 py-3">
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md border border-line bg-elevated text-fg-subtle">
                <Icon className="h-4 w-4" strokeWidth={1.75} />
            </span>
            <div className="min-w-0 flex-1">
                <p className="flex flex-wrap items-center gap-2 text-sm font-medium text-fg">
                    {s.project}
                    <Badge tone={recurring ? "info" : "neutral"}>
                        {recurring ? describeRecurrence(s.cron ?? "") : "Une fois"}
                    </Badge>
                </p>
                <p className="text-[13px] text-fg-muted">
                    {running ? (
                        "En cours d'exécution"
                    ) : at ? (
                        <>
                            {recurring && "Prochaine : "}
                            {formatWhen(at, timezone)}
                            <span className="text-fg-subtle"> · {formatIn(Date.parse(at) - now)}</span>
                        </>
                    ) : (
                        "Plus d'exécution prévue"
                    )}
                </p>
                {s.note && <p className="truncate text-xs text-fg-subtle">{s.note}</p>}
            </div>
            {!running && <CancelButton schedule={s} onCancelled={onCancelled} />}
        </li>
    );
}

/** Annulation en deux temps (« Annuler ? Oui / Non ») : on évite de supprimer une programmation par erreur. */
function CancelButton({ schedule, onCancelled }: { schedule: Schedule; onCancelled: () => void }) {
    const [confirming, setConfirming] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    async function cancel() {
        setLoading(true);
        setError(null);
        try {
            const res = await fetch(`/api/cron/schedules/${schedule.id}`, { method: "DELETE" });
            // 404 : elle a déjà été exécutée ou annulée entre-temps, le résultat est le même
            if (!res.ok && res.status !== 404) {
                const data = await res.json().catch(() => ({}));
                setError(data.error ?? "Annulation impossible");
                return;
            }
            setConfirming(false);
            onCancelled();
        } catch {
            setError("deploy-cron injoignable");
        } finally {
            setLoading(false);
        }
    }

    if (!confirming) {
        return (
            <button
                type="button"
                onClick={() => setConfirming(true)}
                className="btn btn-ghost h-7 px-2 text-xs hover:bg-down/10 hover:text-down"
            >
                <X className="h-3.5 w-3.5" />
                Annuler
                <span className="sr-only">la programmation de {schedule.project}</span>
            </button>
        );
    }

    return (
        <div className="flex flex-col items-end gap-1">
            <div className="flex items-center gap-1.5">
                <span className="text-xs text-fg-muted">Annuler cette programmation ?</span>
                <button type="button" onClick={cancel} disabled={loading} className="btn btn-danger h-7 px-2 text-xs">
                    {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : "Oui"}
                </button>
                <button
                    type="button"
                    onClick={() => setConfirming(false)}
                    disabled={loading}
                    className="btn btn-secondary h-7 px-2 text-xs"
                >
                    Non
                </button>
            </div>
            {error && <p className="max-w-56 text-right text-[11px] text-down">{error}</p>}
        </div>
    );
}

function HistoryRow({ entry: h, timezone }: { entry: HistoryEntry; timezone: string }) {
    const detail = h.error ?? (h.siteCode ? `Site : HTTP ${h.siteCode}` : "");

    return (
        <li className="flex flex-wrap items-center gap-x-4 gap-y-1.5 px-4 py-3">
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md border border-line bg-elevated text-fg-subtle">
                <History className="h-4 w-4" strokeWidth={1.75} />
            </span>
            <div className="min-w-0 flex-1">
                <p className="flex flex-wrap items-center gap-2 text-sm font-medium text-fg">
                    {h.project}
                    <Badge tone={outcomeTone(h.outcome)} dot>
                        {h.outcome}
                    </Badge>
                </p>
                <p className="text-[13px] text-fg-muted">
                    {formatWhen(h.at, timezone)}
                    {h.durationSec != null && <span className="text-fg-subtle"> · {formatDuration(h.durationSec)}</span>}
                    {h.commit && <span className="font-mono text-[12px] text-fg-subtle"> · {h.commit}</span>}
                </p>
                {detail && <p className="text-xs text-fg-subtle">{detail}</p>}
            </div>
        </li>
    );
}
