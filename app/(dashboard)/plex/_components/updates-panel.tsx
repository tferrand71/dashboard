"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { AlertTriangle, Download, Loader2, PackageCheck, RefreshCw } from "lucide-react";
import type { AptSnapshot } from "@/lib/updates";
import type { PlugBlocker } from "@/lib/plug";
import { timeAgo } from "@/lib/format";
import { Badge, ErrorBanner, Skeleton } from "../../_components/ui";
import { Dialog } from "../../_components/dialog";

type StatusResponse =
    | { configured: false }
    | { configured: true; reachable: false; error?: string }
    | ({ configured: true; reachable: true; ok: true } & AptSnapshot);

type Phase =
    | { step: "confirm" }
    | { step: "blocked"; blockers: PlugBlocker[] }
    | { step: "error"; error: string };

const SHOWN = 8;

export function UpdatesPanel() {
    const [data, setData] = useState<StatusResponse | null>(null);
    const [checking, setChecking] = useState(false);
    const [starting, setStarting] = useState(false);
    const [phase, setPhase] = useState<Phase | null>(null);
    const runningRef = useRef(false);

    const refresh = useCallback(async () => {
        try {
            const res = await fetch("/api/plex/updates", { cache: "no-store" });
            if (!res.ok) throw new Error();
            setData((await res.json()) as StatusResponse);
        } catch {
            setData({ configured: true, reachable: false });
        }
    }, []);

    const snap = data && data.configured && data.reachable ? data : null;
    const running = snap?.state.state === "running";
    useEffect(() => {
        runningRef.current = running;
    });

    // Sondage : toutes les 3 s pendant une mise à jour (journal en direct), sinon une fois par minute.
    useEffect(() => {
        let stop = false;
        let timer: ReturnType<typeof setTimeout>;
        const tick = async () => {
            await refresh();
            if (!stop) timer = setTimeout(tick, runningRef.current ? 3_000 : 60_000);
        };
        timer = setTimeout(tick, 0);
        return () => {
            stop = true;
            clearTimeout(timer);
        };
    }, [refresh]);

    async function post(action: "check" | "upgrade", force = false) {
        const res = await fetch("/api/plex/updates", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ action, force }),
        });
        return { status: res.status, json: (await res.json().catch(() => ({}))) as Record<string, unknown> };
    }

    async function check() {
        setChecking(true);
        try {
            const { json } = await post("check");
            if (json.ok === false) setPhase({ step: "error", error: String(json.error ?? "Recherche impossible") });
        } catch {
            setPhase({ step: "error", error: "Le dashboard n'a pas pu joindre l'API." });
        }
        setChecking(false);
        void refresh();
    }

    async function upgrade(force = false) {
        setPhase(null);
        setStarting(true);
        try {
            const { json } = await post("upgrade", force);
            if (json.ok === true) {
                // Le serveur a pris la main : le sondage rapide suit l'avancement.
            } else if (json.blocked === true) {
                setPhase({ step: "blocked", blockers: json.blockers as PlugBlocker[] });
            } else {
                setPhase({ step: "error", error: String(json.error ?? "Lancement impossible") });
            }
        } catch {
            setPhase({ step: "error", error: "Le dashboard n'a pas pu joindre l'API." });
        }
        setStarting(false);
        void refresh();
    }

    if (data && !data.configured) return null;

    const count = snap?.upgradable.length ?? 0;
    const busy = running || checking || starting;
    const last = snap?.state.state === "finished" ? snap.state : null;
    const checkedAt = snap?.checked ? new Date(snap.checked * 1000) : null;

    return (
        <>
            <section className="card overflow-hidden">
                <div className="flex flex-wrap items-center gap-x-4 gap-y-3 px-4 py-3.5">
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-accent/12 text-accent-fg">
                        <PackageCheck className="h-4 w-4" strokeWidth={1.75} />
                    </span>
                    <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                            <h2 className="text-sm font-semibold text-fg">Mises à jour du serveur</h2>
                            {running && (
                                <Badge tone="info" dot>
                                    Mise à jour en cours…
                                </Badge>
                            )}
                            {snap && !running && count === 0 && <Badge tone="ok" dot>À jour</Badge>}
                            {snap && !running && count > 0 && (
                                <Badge tone="warn" dot>
                                    {count} à mettre à jour
                                </Badge>
                            )}
                            {snap?.reboot_required && <Badge tone="warn">Redémarrage nécessaire</Badge>}
                        </div>
                        {!data && <Skeleton className="mt-1.5 h-3.5 w-44" />}
                        {data && !snap && (
                            <p className="mt-0.5 text-xs text-fg-subtle">Serveur injoignable : il est peut-être éteint.</p>
                        )}
                        {snap && (
                            <p className="mt-0.5 text-xs text-fg-subtle">
                                {checkedAt ? `Liste actualisée ${timeAgo(checkedAt)}` : "Liste jamais actualisée"}
                                {snap.deferred.length > 0 &&
                                    ` · ${snap.deferred.length} différée${snap.deferred.length > 1 ? "s" : ""} par Ubuntu (déploiement progressif)`}
                                {last && !running && (last.exit === 0 ? " · dernière mise à jour réussie" : " · dernière mise à jour en échec")}
                            </p>
                        )}
                    </div>
                    {snap && (
                        <div className="flex flex-wrap gap-2">
                            <button type="button" className="btn btn-secondary" disabled={busy} onClick={check}>
                                {checking ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}
                                Rechercher
                            </button>
                            <button
                                type="button"
                                className="btn btn-primary"
                                disabled={busy || count === 0}
                                onClick={() => setPhase({ step: "confirm" })}
                            >
                                {running || starting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Download className="h-3.5 w-3.5" />}
                                Mettre à jour
                            </button>
                        </div>
                    )}
                </div>

                {snap && snap.state.state === "interrupted" && (
                    <div className="px-4 pb-3">
                        <ErrorBanner>La dernière mise à jour a été interrompue (le serveur a redémarré ?). Relance-la pour terminer.</ErrorBanner>
                    </div>
                )}
                {last && last.exit !== 0 && !running && (
                    <div className="px-4 pb-3">
                        <ErrorBanner>La mise à jour a échoué (code {last.exit}). Consulte le journal ci-dessous.</ErrorBanner>
                    </div>
                )}

                {snap && count > 0 && (
                    <details className="border-t border-line px-4 py-2.5 text-[13px]">
                        <summary className="cursor-pointer text-fg-muted hover:text-fg">Paquets concernés</summary>
                        <ul className="mt-2 space-y-1">
                            {snap.upgradable.slice(0, SHOWN).map((p) => (
                                <li key={p.name} className="flex flex-wrap items-baseline gap-x-2 font-mono text-[12px]">
                                    <span className={p.name.includes("plex") ? "font-semibold text-accent-fg" : "text-fg"}>{p.name}</span>
                                    <span className="text-fg-subtle">
                                        {p.from ? `${p.from} → ` : ""}
                                        {p.to}
                                    </span>
                                </li>
                            ))}
                            {count > SHOWN && <li className="text-xs text-fg-subtle">… et {count - SHOWN} autres</li>}
                        </ul>
                    </details>
                )}

                {snap && snap.log && (running || last) && (
                    <details className="border-t border-line px-4 py-2.5 text-[13px]" open={running}>
                        <summary className="cursor-pointer text-fg-muted hover:text-fg">Journal</summary>
                        <pre className="mt-2 max-h-56 overflow-auto whitespace-pre-wrap break-words rounded-md bg-canvas/60 p-3 font-mono text-[11.5px] text-fg-muted">
                            {snap.log}
                        </pre>
                    </details>
                )}
            </section>

            {phase?.step === "confirm" && (
                <Dialog
                    title="Mettre à jour le serveur ?"
                    description={`${count} paquet${count > 1 ? "s" : ""} seront installés (apt-get upgrade).`}
                    onClose={() => setPhase(null)}
                    footer={
                        <>
                            <button type="button" className="btn btn-ghost" onClick={() => setPhase(null)}>
                                Annuler
                            </button>
                            <button type="button" className="btn btn-primary" onClick={() => upgrade()}>
                                Lancer la mise à jour
                            </button>
                        </>
                    }
                >
                    <p className="text-[13px] text-fg-muted">
                        La mise à jour tourne sur le serveur : tu peux fermer cette page. Si Plex en fait partie, il redémarre et coupe les
                        lectures en cours, c&rsquo;est pourquoi le dashboard refuse tant que quelqu&rsquo;un regarde quelque chose. Certaines mises
                        à jour (noyau) demanderont ensuite un redémarrage du serveur.
                    </p>
                </Dialog>
            )}

            {phase?.step === "blocked" && (
                <Dialog
                    title="Mise à jour refusée"
                    description="Mettre à jour maintenant risque d'interrompre une lecture."
                    size="md"
                    onClose={() => setPhase(null)}
                    footer={
                        <>
                            <button type="button" className="btn btn-primary" onClick={() => setPhase(null)}>
                                Attendre
                            </button>
                            <button type="button" className="btn btn-danger" onClick={() => upgrade(true)}>
                                <AlertTriangle className="h-3.5 w-3.5" />
                                Forcer quand même
                            </button>
                        </>
                    }
                >
                    <ul className="space-y-2">
                        {phase.blockers.map((b) => (
                            <li key={b.kind} className="rounded-md border border-warn/30 bg-warn/10 px-3 py-2 text-[13px]">
                                <p className="font-medium text-warn">Lecture Plex en cours</p>
                                <pre className="mt-1 whitespace-pre-wrap break-words font-mono text-[11.5px] text-fg-muted">{b.detail}</pre>
                            </li>
                        ))}
                    </ul>
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
