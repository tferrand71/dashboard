"use client";

import { useState } from "react";
import { AlertTriangle, CheckCircle2, Loader2, Power, RotateCcw } from "lucide-react";
import type { PlugBlocker, PlugStatus } from "@/lib/plug";
import { Badge, ErrorBanner, Panel, Skeleton } from "../../_components/ui";
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

type Phase =
    | { step: "confirm" }
    | { step: "running" }
    | { step: "done"; message: string; warnings: string[] }
    | { step: "blocked"; blockers: PlugBlocker[]; warnings: string[] }
    | { step: "error"; error: string };

const BLOCKER_LABEL: Record<PlugBlocker["kind"], string> = {
    update: "Mise à jour en cours sur le serveur",
    playback: "Lecture Plex en cours",
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

    async function send(action: "restart" | "on", force = false) {
        setPhase({ step: "running" });
        try {
            const res = await fetch("/api/plex/plug", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ action, force }),
            });
            const json = (await res.json()) as ActionResponse;
            if (json.ok) setPhase({ step: "done", message: json.message, warnings: json.warnings });
            else if (json.blocked) setPhase({ step: "blocked", blockers: json.blockers, warnings: json.warnings });
            else setPhase({ step: "error", error: json.error });
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
            <Panel
                title="Alimentation du serveur"
                description="Prise connectée : coupe puis rétablit le courant quand le serveur est planté"
                actions={
                    status ? (
                        <Badge tone={status.on ? "ok" : "warn"} dot>
                            {status.on ? "Prise allumée" : "Prise éteinte"}
                        </Badge>
                    ) : unreachable ? (
                        <Badge tone="down" dot>
                            Prise injoignable
                        </Badge>
                    ) : undefined
                }
            >
                {!data && (
                    <div className="px-4 py-3">
                        <Skeleton className="h-8 w-48" />
                    </div>
                )}
                {unreachable && <ErrorBanner>La prise ne répond pas via le cloud Tuya.</ErrorBanner>}
                {status && (
                    <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3.5">
                        <p className="text-[13px] text-fg-muted">
                            {status.on
                                ? `Consommation actuelle : ${status.powerW.toFixed(1)} W`
                                : "Le serveur n'est pas alimenté."}
                        </p>
                        {status.on ? (
                            <button type="button" className="btn btn-danger" onClick={() => setPhase({ step: "confirm" })}>
                                <RotateCcw className="h-3.5 w-3.5" />
                                Redémarrer le serveur
                            </button>
                        ) : (
                            <button type="button" className="btn btn-primary" disabled={running} onClick={() => send("on")}>
                                <Power className="h-3.5 w-3.5" />
                                Allumer la prise
                            </button>
                        )}
                    </div>
                )}
            </Panel>

            {phase?.step === "confirm" && (
                <Dialog
                    title="Redémarrer le serveur ?"
                    description="Le courant sera coupé environ 15 secondes puis rétabli."
                    onClose={() => setPhase(null)}
                    footer={
                        <>
                            <button type="button" className="btn btn-ghost" onClick={() => setPhase(null)}>
                                Annuler
                            </button>
                            <button type="button" className="btn btn-danger" onClick={() => send("restart")}>
                                Couper puis rallumer
                            </button>
                        </>
                    }
                >
                    <p className="text-[13px] text-fg-muted">
                        Avant de couper, le dashboard vérifie qu&rsquo;aucune mise à jour ne tourne sur le serveur et que personne ne
                        regarde Plex. C&rsquo;est un arrêt brutal, à réserver à un serveur planté.
                    </p>
                </Dialog>
            )}

            {phase?.step === "running" && (
                <Dialog title="Redémarrage en cours…" onClose={() => {}}>
                    <div className="flex items-center gap-3 text-[13px] text-fg-muted">
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Vérifications, coupure, attente puis remise sous tension (environ 20 secondes).
                    </div>
                </Dialog>
            )}

            {phase?.step === "done" && (
                <Dialog
                    title="Courant rétabli"
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
                    title="Redémarrage refusé"
                    description="Couper le courant maintenant interromprait quelque chose."
                    size="md"
                    onClose={() => setPhase(null)}
                    footer={
                        <>
                            <button type="button" className="btn btn-primary" onClick={() => setPhase(null)}>
                                Attendre
                            </button>
                            <button type="button" className="btn btn-danger" onClick={() => send("restart", true)}>
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
