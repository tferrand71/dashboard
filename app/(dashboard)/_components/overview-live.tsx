"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { AlertTriangle, ArrowRight, Boxes, CheckCircle2, Container, Cpu, HardDrive, MemoryStick } from "lucide-react";
import type { AgentProject, ContainerStats, HostStats } from "@/lib/agent";
import { isEphemeral, level } from "@/lib/agent";
import { formatPercent } from "@/lib/format";
import { hostCards, MetricCard, useContainers, useHostStats } from "./live-metrics";
import { ProjectsTable } from "./projects-table";
import { EmptyState, ErrorBanner, LiveIndicator, Panel, StatusDot, type Tone } from "./ui";
import { usePoll } from "./use-poll";

type Alert = { tone: Tone; title: string; detail: string; href: string };

/** Points d'attention déduits des données réelles — rien d'inventé. */
function computeAlerts(
    projects: AgentProject[] | null,
    host: HostStats | null,
    containers: ContainerStats[] | null,
): Alert[] {
    const alerts: Alert[] = [];
    for (const p of projects ?? []) {
        if (p.status === "FAILED") {
            alerts.push({ tone: "down", title: `${p.name} : dernier déploiement en échec`, detail: p.subdomain, href: "/conteneurs" });
        }
        if (p.status === "BUILDING") {
            alerts.push({ tone: "info", title: `${p.name} : build en cours`, detail: p.subdomain, href: "/conteneurs" });
        }
    }
    if (host) {
        const checks: [string, number][] = [
            ["Disque", host.disk.percent],
            ["Mémoire", host.memory.percent],
            ["CPU", host.cpu.percent],
        ];
        for (const [name, pct] of checks) {
            const tone = level(pct);
            if (tone !== "ok") {
                alerts.push({ tone, title: `${name} à ${formatPercent(pct, 0)}`, detail: "Ressource du VPS", href: "/systeme" });
            }
        }
    }
    const ephemeral = (containers ?? []).filter(isEphemeral).length;
    if (ephemeral > 0) {
        alerts.push({
            tone: "neutral",
            title: `${ephemeral} conteneur${ephemeral > 1 ? "s" : ""} temporaire${ephemeral > 1 ? "s" : ""}`,
            detail: "Étapes de build en cours, disparaissent seules",
            href: "/systeme",
        });
    }
    return alerts;
}

export function OverviewLive({ health }: { health: ReactNode }) {
    const projects = usePoll<AgentProject[]>("/api/deploy/projects", 10000);
    const host = useHostStats();
    const containers = useContainers();

    const cards = hostCards(host.data, host.history);
    const online = projects.data?.filter((p) => p.status === "RUNNING").length ?? 0;
    const failed = projects.data?.filter((p) => p.status === "FAILED").length ?? 0;
    const services = containers.data?.filter((c) => !isEphemeral(c)).length ?? 0;
    const alerts = computeAlerts(projects.data, host.data, containers.data);

    return (
        <div className="mt-8 space-y-6">
            <div className="flex items-center justify-between">
                <h2 className="text-sm font-semibold text-fg">Indicateurs</h2>
                <LiveIndicator updatedAt={host.updatedAt} error={host.error} />
            </div>

            <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
                <MetricCard
                    label="Projets en ligne"
                    icon={Boxes}
                    loading={!projects.data}
                    value={`${online} / ${projects.data?.length ?? 0}`}
                    sub={failed ? `${failed} en échec` : "tous opérationnels"}
                />
                <MetricCard
                    label="Conteneurs"
                    icon={Container}
                    loading={!containers.data}
                    value={String(services)}
                    sub="services actifs"
                />
                <MetricCard label="CPU" icon={Cpu} loading={!cards} {...(cards?.cpu ?? { value: "" })} />
                <MetricCard label="Mémoire" icon={MemoryStick} loading={!cards} {...(cards?.memory ?? { value: "" })} />
                <div className="col-span-2 lg:col-span-1">
                    <MetricCard label="Disque" icon={HardDrive} loading={!cards} {...(cards?.disk ?? { value: "" })} />
                </div>
            </div>

            <div className="grid gap-6 lg:grid-cols-3">
                <Panel
                    title="Projets"
                    description="Déployés par deploy-agent depuis leur dépôt Git"
                    className="lg:col-span-2"
                    actions={
                        <Link href="/conteneurs" className="btn btn-ghost h-7 px-2 text-xs">
                            Gérer
                            <ArrowRight className="h-3.5 w-3.5" />
                        </Link>
                    }
                >
                    {projects.error && !projects.data ? (
                        <div className="p-4">
                            <ErrorBanner>Impossible de joindre deploy-agent.</ErrorBanner>
                        </div>
                    ) : projects.data?.length === 0 ? (
                        <EmptyState icon={Boxes} title="Aucun projet">
                            Ajoute un dépôt Git depuis la page Projets.
                        </EmptyState>
                    ) : (
                        <ProjectsTable projects={projects.data} showSource={false} />
                    )}
                </Panel>

                <div className="space-y-6">
                    <Panel title="Points d'attention">
                        {alerts.length === 0 ? (
                            <div className="flex items-center gap-3 px-4 py-4 text-[13px] text-fg-muted">
                                <CheckCircle2 className="h-4 w-4 shrink-0 text-ok" />
                                {projects.data && host.data ? "Rien à signaler." : "Analyse en cours…"}
                            </div>
                        ) : (
                            <ul className="divide-y divide-line">
                                {alerts.map((a) => (
                                    <li key={a.title}>
                                        <Link href={a.href} className="flex items-start gap-3 px-4 py-3 transition-colors hover:bg-elevated/50">
                                            <span className="mt-1.5">
                                                {a.tone === "down" || a.tone === "warn" ? (
                                                    <AlertTriangle className={`-mt-1 h-4 w-4 ${a.tone === "down" ? "text-down" : "text-warn"}`} />
                                                ) : (
                                                    <StatusDot tone={a.tone} pulse={a.tone === "info"} />
                                                )}
                                            </span>
                                            <span className="min-w-0">
                                                <span className="block text-[13px] font-medium text-fg">{a.title}</span>
                                                <span className="block truncate text-xs text-fg-subtle">{a.detail}</span>
                                            </span>
                                        </Link>
                                    </li>
                                ))}
                            </ul>
                        )}
                    </Panel>

                    {health}
                </div>
            </div>
        </div>
    );
}
