"use client";

import { useState } from "react";
import { AlertTriangle, CheckCircle2, Loader2, Power, PowerOff, RotateCcw } from "lucide-react";
import type { PlugBlocker, PlugStatus } from "@/lib/plug";
import { Badge, ErrorBanner, Skeleton } from "../../_components/ui";
import { Dialog } from "../../_components/dialog";
import { usePoll } from "../../_components/use-poll";

type PlugResponse =
    | { configured: false }
    | { configured: true; reachable: false }
    | { configured: true; reachable: true; status: PlugStatus };

type ActionResponse =
    | { ok: true; message: string; warnings: string[] }
    | { ok: false; blocked: true; blockers: PlugBlocker[]; warnings: string[] }
    | { ok: false; blocked: false; error: string };

/** restart / off coupent le courant (avec vérifications) ; on le rétablit simplement. */
type Action = "restart" | "off" | "on";
type CutAction = Exclude<Action, "on">;

type Phase =
    | { step: "confirm"; action: CutAction }
    | { step: "running"; action: Action }
    | { step: "done"; message: string; warnings: string[] }
    | { step: "blocked"; action: CutAction; blockers: PlugBlocker[]; warnings: string[] }
    | { step: "error"; error: string };

const BLOCKER_LABEL: Record<PlugBlocker["kind"], string> = {
    update: "Mise à jour en cours sur le serveur",
    playback: "Lecture Plex en cours",
};

const COPY: Record<CutAction, { title: string; description: string; confirm: string; body: string }> = {
    restart: {
        title: "Redémarrer le serveur ?",
        description: "Le courant sera coupé environ 15 secondes puis rétabli.",
        confirm: "Couper puis rallumer",
        body: "C'est un arrêt brutal, à réserver à un serveur planté.",
    },
    off: {
        title: "Éteindre la prise ?",
        description: "Le serveur sera privé de courant, et le restera jusqu'à ce que tu rallumes la prise ici.",
        confirm: "Éteindre la prise",
        body: "C'est une coupure brutale, comme si on débranchait : le serveur ne s'arrête pas proprement. Pour une coupure propre, éteins-le d'abord depuis lui-même.",
    },
};

const RUNNING_TEXT: Record<Action, { title: string; text: string }> = {
    restart: {
        title: "Redémarrage en cours…",
        text: "Vérifications, coupure, attente puis remise sous tension (environ 20 secondes).",
    },
    off: { title: "Extinction en cours…", text: "Vérifications puis coupure du courant (quelques secondes)." },
    on: { title: "Allumage en cours…", text: "Remise sous tension de la prise." },
};

function Blockers({ blockers }: { blockers: PlugBlocker[] }) {
    return (
        <ul className="space-y-2">
            {blockers.map((b) => (
                <li key={b.kind} className="rounded-md border border-warn/30 bg-warn/10 px-3 py-2 text-[13px]">
                    <p className="font-medium text-warn">{BLOCKER_LABEL[b.kind]}</p>
                    <pre className="mt-1 max-h-32 overflow-auto whitespace-pre-wrap break-words font-mono text-[11.5px] text-fg-muted">
                        {b.detail}
                    </pre>
                </li>
            ))}
        </ul>
    );
}

export function PowerPanel() {
    const { data, refresh } = usePoll<PlugResponse>("/api/plex/plug", 120_000, undefined, "Prise injoignable");
    const [phase, setPhase] = useState<Phase | null>(null);

    async function send(action: Action, force = false) {
        setPhase({ step: "running", action });
        try {
            const res = await fetch("/api/plex/plug", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ action, force }),
            });
            const json = (await res.json()) as ActionResponse;
            if (json.ok) setPhase({ step: "done", message: json.message, warnings: json.warnings });
            else if (json.blocked && action !== "on") {
                setPhase({ step: "blocked", action, blockers: json.blockers, warnings: json.warnings });
            } else setPhase({ step: "error", error: "error" in json ? json.error : "Action refusée" });
        } catch {
            setPhase({ step: "error", error: "Le dashboard n'a pas pu joindre l'API." });
        }
        void refresh();
    }

    // Prise non configurée sur ce déploiement : on n'affiche rien.
    if (data && !data.configured) return null;

    const status = data && data.configured && data.reachable ? data.status : null;
    const unreachable = data && data.configured && !data.reachable;
    const running = phase?.step === "running";

    return (
        <>
            <section className="card flex flex-wrap items-center gap-x-4 gap-y-3 px-4 py-3.5">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-accent/12 text-accent-fg">
                    <Power className="h-4 w-4" strokeWidth={1.75} />
                </span>
                <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                        <h2 className="text-sm font-semibold text-fg">Alimentation du serveur</h2>
                        {status && (
                            <Badge tone={status.on ? "ok" : "warn"} dot>
                                {status.on ? "Prise allumée" : "Prise éteinte"}
                            </Badge>
                        )}
                        {unreachable && (
                            <Badge tone="down" dot>
                                Prise injoignable
                            </Badge>
                        )}
                    </div>
                    {!data && <Skeleton className="mt-1.5 h-3.5 w-40" />}
                    {unreachable && <p className="mt-0.5 text-xs text-down">La prise ne répond pas via le cloud Tuya.</p>}
                    {status && (
                        <p className="mt-0.5 text-xs text-fg-subtle">
                            {status.on ? `Consommation actuelle : ${status.powerW.toFixed(1)} W` : "Le serveur n'est pas alimenté."}
                        </p>
                    )}
                </div>
                {status &&
                    (status.on ? (
                        <div className="flex flex-wrap gap-2">
                            <button type="button" className="btn btn-secondary" onClick={() => setPhase({ step: "confirm", action: "restart" })}>
                                <RotateCcw className="h-3.5 w-3.5" />
                                Redémarrer
                            </button>
                            <button type="button" className="btn btn-danger" onClick={() => setPhase({ step: "confirm", action: "off" })}>
                                <PowerOff className="h-3.5 w-3.5" />
                                Éteindre la prise
                            </button>
                        </div>
                    ) : (
                        <button type="button" className="btn btn-primary" disabled={running} onClick={() => send("on")}>
                            <Power className="h-3.5 w-3.5" />
                            Allumer la prise
                        </button>
                    ))}
            </section>

            {phase?.step === "confirm" && (
                <Dialog
                    title={COPY[phase.action].title}
                    description={COPY[phase.action].description}
                    onClose={() => setPhase(null)}
                    footer={
                        <>
                            <button type="button" className="btn btn-ghost" onClick={() => setPhase(null)}>
                                Annuler
                            </button>
                            <button type="button" className="btn btn-danger" onClick={() => send(phase.action)}>
                                {COPY[phase.action].confirm}
                            </button>
                        </>
                    }
                >
                    <p className="text-[13px] text-fg-muted">
                        Avant de couper, le dashboard vérifie qu&rsquo;aucune mise à jour ne tourne sur le serveur et que personne ne
                        regarde Plex. {COPY[phase.action].body}
                    </p>
                </Dialog>
            )}

            {phase?.step === "running" && (
                <Dialog title={RUNNING_TEXT[phase.action].title} onClose={() => {}}>
                    <div className="flex items-center gap-3 text-[13px] text-fg-muted">
                        <Loader2 className="h-4 w-4 animate-spin" />
                        {RUNNING_TEXT[phase.action].text}
                    </div>
                </Dialog>
            )}

            {phase?.step === "done" && (
                <Dialog
                    title="Terminé"
                    onClose={() => setPhase(null)}
                    footer={
                        <button type="button" className="btn btn-primary" onClick={() => setPhase(null)}>
                            Fermer
                        </button>
                    }
                >
                    <div className="flex gap-2.5 text-[13px] text-fg-muted">
                        <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-ok" />
                        <div className="space-y-1.5">
                            <p>{phase.message}</p>
                            {phase.warnings.map((w) => (
                                <p key={w} className="text-warn">
                                    {w}
                                </p>
                            ))}
                        </div>
                    </div>
                </Dialog>
            )}

            {phase?.step === "blocked" && (
                <Dialog
                    title={phase.action === "off" ? "Extinction refusée" : "Redémarrage refusé"}
                    description="Couper le courant maintenant interromprait quelque chose."
                    size="md"
                    onClose={() => setPhase(null)}
                    footer={
                        <>
                            <button type="button" className="btn btn-primary" onClick={() => setPhase(null)}>
                                Attendre
                            </button>
                            <button type="button" className="btn btn-danger" onClick={() => send(phase.action, true)}>
                                <AlertTriangle className="h-3.5 w-3.5" />
                                Forcer quand même
                            </button>
                        </>
                    }
                >
                    <Blockers blockers={phase.blockers} />
                </Dialog>
            )}

            {phase?.step === "error" && (
                <Dialog
                    title="Échec"
                    onClose={() => setPhase(null)}
                    footer={
                        <button type="button" className="btn btn-primary" onClick={() => setPhase(null)}>
                            Fermer
                        </button>
                    }
                >
                    <ErrorBanner>{phase.error}</ErrorBanner>
                </Dialog>
            )}
        </>
    );
}
