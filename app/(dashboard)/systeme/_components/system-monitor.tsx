"use client";

import { useMemo, useState } from "react";
import { ArrowDownUp, Container, Cpu, HardDrive, MemoryStick, Search } from "lucide-react";
import type { AgentProject, ContainerStats, ContainerStorage } from "@/lib/agent";
import { containerLabel, isEphemeral, level } from "@/lib/agent";
import { formatBytes, formatPercent } from "@/lib/format";
import { hostCards, MetricCard, useContainers, useHostStats } from "../../_components/live-metrics";
import { Badge, EmptyState, ErrorBanner, LiveIndicator, Meter, Panel, Skeleton, toneTextClass } from "../../_components/ui";
import { usePoll } from "../../_components/use-poll";

/** « Up 2 hours (healthy) » → { uptime: "2 h", health: "healthy" } */
function parseStatus(status: string): { running: boolean; uptime: string; health: string | null } {
    const health = status.match(/\((healthy|unhealthy|health: starting)\)/)?.[1] ?? null;
    const running = status.startsWith("Up");
    const uptime = status
        .replace(/^Up\s+/, "")
        .replace(/\s*\(.*\)\s*$/, "")
        .replace(/^About an? /, "~1 ")
        .replace(/Less than a second/, "< 1 s")
        .replace(/\bseconds?\b/, "s")
        .replace(/\bminutes?\b/, "min")
        .replace(/\bhours?\b/, "h")
        .replace(/\bdays?\b/, "j")
        .replace(/\bweeks?\b/, "sem.")
        .replace(/\bmonths?\b/, "mois");
    return { running, uptime, health };
}

type SortKey = "name" | "cpu" | "memory";

/** Détail du stockage au survol : couche propre, image partagée, volumes. */
function storageTitle(st: ContainerStorage): string {
    const vols = st.volumes.length
        ? st.volumes.map((v) => `${v.name} : ${v.sizeBytes === null ? "taille inconnue" : formatBytes(v.sizeBytes)}`).join("\n")
        : "aucun volume";
    return `Couche propre : ${formatBytes(st.writableBytes)}\nImage (partagée) : ${formatBytes(st.imageBytes)}\n${vols}`;
}

function ContainerTable({
    rows,
    projects,
    storage,
}: {
    rows: ContainerStats[];
    projects: AgentProject[];
    storage: Map<string, ContainerStorage>;
}) {
    return (
        <div className="overflow-x-auto">
            <table className="w-full text-left text-[13px]">
                <thead className="text-xs text-fg-subtle">
                    <tr className="border-b border-line">
                        <th scope="col" className="px-4 py-2.5 font-medium">Conteneur</th>
                        <th scope="col" className="hidden px-4 py-2.5 font-medium md:table-cell">État</th>
                        <th scope="col" className="w-28 px-4 py-2.5 text-right font-medium sm:w-36">Stockage</th>
                        <th scope="col" className="w-28 px-4 py-2.5 text-right font-medium sm:w-40">CPU</th>
                        <th scope="col" className="w-32 px-4 py-2.5 text-right font-medium sm:w-48">Mémoire</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-line">
                    {rows.map((c) => {
                        const s = parseStatus(c.status);
                        const label = containerLabel(c, projects);
                        const memTone = level(c.memory.percent);
                        const cpuTone = level(c.cpu.percent);
                        return (
                            <tr key={c.id} className="transition-colors hover:bg-elevated/50">
                                <td className="max-w-0 px-4 py-3">
                                    <p className="truncate font-medium text-fg" title={c.name}>
                                        {label}
                                    </p>
                                    <p className="truncate font-mono text-xs text-fg-subtle" title={c.image}>
                                        {c.image.startsWith("sha256:")
                                            ? `couche ${c.image.slice(7, 19)}`
                                            : c.image.startsWith("deploy-agent/")
                                              ? `deploy-agent · ${projects.find((p) => c.name === `project-${p.id}`)?.subdomain ?? c.image}`
                                              : c.image}
                                    </p>
                                </td>
                                <td className="hidden whitespace-nowrap px-4 py-3 md:table-cell">
                                    <div className="flex items-center gap-2">
                                        <Badge tone={s.running ? "ok" : "neutral"} dot>
                                            {s.running ? "Actif" : "Arrêté"}
                                        </Badge>
                                        {s.health === "healthy" && <Badge tone="ok">sain</Badge>}
                                        {s.health === "unhealthy" && <Badge tone="down">défaillant</Badge>}
                                        <span className="tabular text-xs text-fg-subtle">{s.uptime}</span>
                                    </div>
                                </td>
                                <td className="px-4 py-3 text-right">
                                    {(() => {
                                        const st = storage.get(c.id);
                                        return st ? (
                                            <span className="tabular text-xs text-fg-muted" title={storageTitle(st)}>
                                                {formatBytes(st.totalBytes)}
                                            </span>
                                        ) : (
                                            <span className="text-xs text-fg-subtle">—</span>
                                        );
                                    })()}
                                </td>
                                <td className="px-4 py-3">
                                    <div className="flex items-center justify-end gap-3">
                                        <span className="hidden w-16 sm:block">
                                            <Meter percent={c.cpu.percent} tone={cpuTone} />
                                        </span>
                                        <span className={`tabular w-14 text-right text-xs ${cpuTone === "ok" ? "text-fg-muted" : toneTextClass(cpuTone)}`}>
                                            {formatPercent(c.cpu.percent)}
                                        </span>
                                    </div>
                                </td>
                                <td className="px-4 py-3">
                                    <div className="flex items-center justify-end gap-3">
                                        <span className="hidden w-16 sm:block">
                                            <Meter percent={c.memory.percent} tone={memTone} />
                                        </span>
                                        <span className="tabular w-16 text-right text-xs text-fg-muted">
                                            {formatBytes(c.memory.usedBytes)}
                                        </span>
                                    </div>
                                </td>
                            </tr>
                        );
                    })}
                </tbody>
            </table>
        </div>
    );
}

export function SystemMonitor() {
    const host = useHostStats();
    const containers = useContainers(5000);
    const projects = usePoll<AgentProject[]>("/api/deploy/projects", 30000);
    // le stockage se calcule côté Docker (plus lent) : rafraîchi seulement chaque minute
    const storage = usePoll<ContainerStorage[]>("/api/deploy/system/storage", 60000);
    const storageById = useMemo(() => new Map((storage.data ?? []).map((st) => [st.id, st])), [storage.data]);
    const [query, setQuery] = useState("");
    const [sort, setSort] = useState<SortKey>("memory");

    const cards = hostCards(host.data, host.history);

    const { services, ephemeral } = useMemo(() => {
        const list = projects.data ?? [];
        const q = query.trim().toLowerCase();
        const filtered = (containers.data ?? []).filter(
            (c) => !q || `${c.name} ${c.image} ${containerLabel(c, list)}`.toLowerCase().includes(q),
        );
        const sorted = [...filtered].sort((a, b) =>
            sort === "name"
                ? containerLabel(a, list).localeCompare(containerLabel(b, list))
                : sort === "cpu"
                  ? b.cpu.percent - a.cpu.percent
                  : b.memory.usedBytes - a.memory.usedBytes,
        );
        return { services: sorted.filter((c) => !isEphemeral(c)), ephemeral: sorted.filter(isEphemeral) };
    }, [containers.data, projects.data, query, sort]);

    const totalMem = (containers.data ?? []).reduce((sum, c) => sum + c.memory.usedBytes, 0);
    const sortLabel: Record<SortKey, string> = { memory: "Mémoire", cpu: "CPU", name: "Nom" };
    const nextSort: Record<SortKey, SortKey> = { memory: "cpu", cpu: "name", name: "memory" };

    return (
        <div className="mt-8 space-y-6">
            <div className="flex items-center justify-between">
                <h2 className="text-sm font-semibold text-fg">Ressources de l&apos;hôte</h2>
                <LiveIndicator updatedAt={host.updatedAt} error={host.error} />
            </div>

            <div className="grid gap-3 sm:grid-cols-3">
                <MetricCard label="CPU" icon={Cpu} loading={!cards} {...(cards?.cpu ?? { value: "" })} />
                <MetricCard label="Mémoire" icon={MemoryStick} loading={!cards} {...(cards?.memory ?? { value: "" })} />
                <MetricCard label="Disque" icon={HardDrive} loading={!cards} {...(cards?.disk ?? { value: "" })} />
            </div>

            <Panel
                title="Conteneurs Docker"
                description={
                    containers.data
                        ? `${services.length} service${services.length > 1 ? "s" : ""} · ${formatBytes(totalMem)} de mémoire au total`
                        : "Chargement…"
                }
                actions={
                    <>
                        <label className="relative hidden sm:block">
                            <span className="sr-only">Filtrer les conteneurs</span>
                            <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-fg-subtle" />
                            <input
                                value={query}
                                onChange={(e) => setQuery(e.target.value)}
                                placeholder="Filtrer…"
                                className="input h-7 w-44 pl-8 text-xs"
                            />
                        </label>
                        <button
                            type="button"
                            onClick={() => setSort(nextSort[sort])}
                            className="btn btn-secondary h-7 px-2 text-xs"
                            title="Changer le tri"
                        >
                            <ArrowDownUp className="h-3.5 w-3.5" />
                            {sortLabel[sort]}
                        </button>
                    </>
                }
            >
                {containers.error && !containers.data ? (
                    <div className="p-4">
                        <ErrorBanner>Impossible de joindre deploy-agent.</ErrorBanner>
                    </div>
                ) : !containers.data ? (
                    <div className="divide-y divide-line">
                        {[0, 1, 2, 3].map((i) => (
                            <div key={i} className="flex items-center gap-4 px-4 py-3.5">
                                <div className="flex-1 space-y-1.5">
                                    <Skeleton className="h-3.5 w-36" />
                                    <Skeleton className="h-3 w-52" />
                                </div>
                                <Skeleton className="h-3 w-20" />
                            </div>
                        ))}
                    </div>
                ) : services.length === 0 ? (
                    <EmptyState icon={Container} title={query ? "Aucun résultat" : "Aucun conteneur actif"} />
                ) : (
                    <ContainerTable rows={services} projects={projects.data ?? []} storage={storageById} />
                )}
            </Panel>

            {ephemeral.length > 0 && (
                <Panel
                    title="Conteneurs temporaires"
                    description="Étapes de build ou commandes ponctuelles : Docker leur donne un nom au hasard et les supprime à la fin."
                >
                    <ContainerTable rows={ephemeral} projects={projects.data ?? []} storage={storageById} />
                </Panel>
            )}
        </div>
    );
}
