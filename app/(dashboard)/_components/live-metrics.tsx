"use client";

import { useState } from "react";
import type { LucideIcon } from "lucide-react";
import type { ContainerStats, HostStats } from "@/lib/agent";
import { level } from "@/lib/agent";
import { formatBytes, formatPercent } from "@/lib/format";
import { Meter, Skeleton, Sparkline, toneTextClass } from "./ui";
import { usePoll } from "./use-poll";

const HISTORY = 36; // 3 min à 5 s d'intervalle

/** Ressources de l'hôte + historique court gardé en mémoire pour les courbes. */
export function useHostStats() {
    const [history, setHistory] = useState<{ cpu: number[]; mem: number[] }>({ cpu: [], mem: [] });
    const poll = usePoll<HostStats>("/api/deploy/system/host", 5000, (h) =>
        setHistory((prev) => ({
            cpu: [...prev.cpu, h.cpu.percent].slice(-HISTORY),
            mem: [...prev.mem, h.memory.percent].slice(-HISTORY),
        })),
    );
    return { ...poll, history };
}

export function useContainers(intervalMs = 10000) {
    return usePoll<ContainerStats[]>("/api/deploy/system/containers", intervalMs);
}

export function MetricCard({
    label,
    icon: Icon,
    value,
    sub,
    percent,
    series,
    loading,
}: {
    label: string;
    icon: LucideIcon;
    value: string;
    sub?: string;
    percent?: number;
    series?: number[];
    loading?: boolean;
}) {
    const tone = percent === undefined ? "neutral" : level(percent);

    return (
        <div className="card flex h-full flex-col p-4 transition-colors hover:border-accent/40">
            <div className="flex items-center justify-between text-fg-muted">
                <span className="text-[13px] font-medium">{label}</span>
                <span className="flex h-7 w-7 items-center justify-center rounded-md bg-accent/12 text-accent-fg ring-1 ring-accent/25">
                    <Icon className="h-3.5 w-3.5" strokeWidth={2} />
                </span>
            </div>

            {loading ? (
                <>
                    <Skeleton className="mt-3 h-7 w-20" />
                    <Skeleton className="mt-2 h-3 w-28" />
                    <Skeleton className="mt-4 h-1.5 w-full" />
                </>
            ) : (
                <>
                    <p
                        className={`tabular mt-2 text-2xl font-semibold tracking-tight ${
                            tone === "neutral" || tone === "ok" ? "text-fg" : toneTextClass(tone)
                        }`}
                    >
                        {value}
                    </p>
                    {sub && <p className="tabular mt-0.5 text-xs text-fg-subtle">{sub}</p>}
                    <div className="mt-auto pt-3">
                        {series ? (
                            <Sparkline values={series} />
                        ) : percent !== undefined ? (
                            <Meter percent={percent} tone={tone} />
                        ) : null}
                    </div>
                </>
            )}
        </div>
    );
}

export function hostCards(host: HostStats | null, history: { cpu: number[]; mem: number[] }) {
    if (!host) return null;
    return {
        cpu: {
            value: formatPercent(host.cpu.percent),
            sub: "utilisation moyenne",
            percent: host.cpu.percent,
            series: history.cpu,
        },
        memory: {
            value: formatPercent(host.memory.percent),
            sub: `${formatBytes(host.memory.usedKb * 1024)} sur ${formatBytes(host.memory.totalKb * 1024)}`,
            percent: host.memory.percent,
            series: history.mem,
        },
        disk: {
            value: formatPercent(host.disk.percent),
            sub: `${formatBytes(host.disk.availableKb * 1024)} libres sur ${formatBytes(host.disk.totalKb * 1024)}`,
            percent: host.disk.percent,
        },
    };
}
