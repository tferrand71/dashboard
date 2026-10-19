"use client";

import { useState } from "react";
import type { LucideIcon } from "lucide-react";
import {
    AlertTriangle,
    ArrowDownRight,
    ArrowUpRight,
    Eye,
    Gauge,
    Globe,
    Link2,
    MonitorSmartphone,
    ShieldCheck,
    Users,
    Zap,
} from "lucide-react";
import { formatBytes, formatPercent, timeAgo } from "@/lib/format";
import { EmptyState, ErrorBanner, LiveIndicator, Panel, Skeleton } from "../../_components/ui";
import { usePoll } from "../../_components/use-poll";
import { AreaChart, type Point } from "./area-chart";

type Named = { name: string; visitors: number };

type Analytics = {
    range: string;
    host: string | null;
    bucket: "hour" | "day";
    lastIngestAt: string | null;
    totals: {
        pageviews: number;
        visitors: number;
        requests: number;
        bots: number;
        bytes: number;
        avgMs: number | null;
        p95Ms: number | null;
        errorRate: number;
    };
    previous: { pageviews: number; visitors: number };
    statuses: Record<string, number>;
    series: (Point & { requests: number })[];
    topPages: { host: string; path: string; pageviews: number; visitors: number }[];
    referrers: Named[];
    browsers: Named[];
    os: Named[];
    devices: Named[];
    sites: { host: string; pageviews: number; visitors: number; requests: number; errors: number; avgMs: number | null }[];
    errors: { host: string; path: string; status: number; count: number; last: string }[];
};

const RANGES = [
    { key: "24h", label: "24 h" },
    { key: "7d", label: "7 jours" },
    { key: "30d", label: "30 jours" },
    { key: "90d", label: "90 jours" },
];

const nf = new Intl.NumberFormat("fr-FR");

/* ── Petits composants ───────────────────────────────────────── */

function Delta({ now, before }: { now: number; before: number }) {
    if (!before) return <span className="text-xs text-fg-subtle">pas de période précédente</span>;
    const pct = ((now - before) / before) * 100;
    const up = pct >= 0;
    const Icon = up ? ArrowUpRight : ArrowDownRight;
    return (
        <span className="tabular inline-flex items-center gap-1 whitespace-nowrap text-xs">
            <span className={`inline-flex items-center ${up ? "text-ok" : "text-down"}`}>
                <Icon className="h-3.5 w-3.5" />
                {formatPercent(Math.abs(pct), 0)}
            </span>
            <span className="text-fg-subtle">vs période préc.</span>
        </span>
    );
}

function Kpi({
    label,
    icon: Icon,
    value,
    footer,
}: {
    label: string;
    icon: LucideIcon;
    value: string;
    footer?: React.ReactNode;
}) {
    return (
        <div className="card flex flex-col p-4 transition-colors hover:border-accent/40">
            <div className="flex items-center justify-between text-fg-muted">
                <span className="text-[13px] font-medium">{label}</span>
                <span className="flex h-7 w-7 items-center justify-center rounded-md bg-accent/12 text-accent-fg ring-1 ring-accent/25">
                    <Icon className="h-3.5 w-3.5" strokeWidth={2} />
                </span>
            </div>
            <p className="tabular mt-2 text-2xl font-semibold tracking-tight text-fg">{value}</p>
            {footer && <div className="mt-1">{footer}</div>}
        </div>
    );
}

/** Liste avec barre de proportion en fond, façon Plausible. */
function BarList({ items, empty }: { items: { label: React.ReactNode; key: string; value: number }[]; empty: string }) {
    const max = Math.max(1, ...items.map((i) => i.value));
    if (!items.length) return <p className="px-4 py-6 text-center text-[13px] text-fg-subtle">{empty}</p>;
    return (
        <ul className="space-y-1 p-3">
            {items.map((item) => (
                <li key={item.key} className="relative flex items-center justify-between gap-3 overflow-hidden rounded px-2.5 py-1.5 text-[13px]">
                    <span
                        aria-hidden="true"
                        className="absolute inset-y-0 left-0 rounded bg-gradient-to-r from-accent/25 to-accent/10"
                        style={{ width: `${(item.value / max) * 100}%` }}
                    />
                    <span className="relative min-w-0 truncate text-fg">{item.label}</span>
                    <span className="tabular relative shrink-0 text-fg-muted">{nf.format(item.value)}</span>
                </li>
            ))}
        </ul>
    );
}

function Tabs<T extends string>({
    value,
    onChange,
    options,
}: {
    value: T;
    onChange: (v: T) => void;
    options: { key: T; label: string }[];
}) {
    return (
        <div className="inline-flex rounded-md border border-line bg-canvas/60 p-0.5" role="tablist">
            {options.map((o) => (
                <button
                    key={o.key}
                    type="button"
                    role="tab"
                    aria-selected={value === o.key}
                    onClick={() => onChange(o.key)}
                    className={`rounded px-2.5 py-1 text-xs font-medium transition-colors ${
                        value === o.key ? "bg-accent/20 text-fg shadow-[inset_0_0_0_1px_rgba(139,92,246,0.35)]" : "text-fg-muted hover:text-fg"
                    }`}
                >
                    {o.label}
                </button>
            ))}
        </div>
    );
}

/* ── Vue principale ──────────────────────────────────────────── */

export function AnalyticsView() {
    const [range, setRange] = useState("7d");
    const [host, setHost] = useState<string>("");
    const [tech, setTech] = useState<"browsers" | "os" | "devices">("browsers");

    const query = new URLSearchParams({ range, ...(host ? { host } : {}) }).toString();
    const { data, error, updatedAt } = usePoll<Analytics>(`/api/deploy/analytics?${query}`, 60_000);

    // Les données affichées peuvent dater de l'ancien filtre le temps du rechargement
    const stale = data && (data.range !== range || (data.host ?? "") !== host);
    const t = data?.totals;
    const statusTotal = Object.values(data?.statuses ?? {}).reduce((a, b) => a + b, 0);

    return (
        <div className="mt-8 space-y-6">
            <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex flex-wrap items-center gap-2">
                    <label className="relative">
                        <span className="sr-only">Site</span>
                        <Globe className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-accent-fg" />
                        <select
                            value={host}
                            onChange={(e) => setHost(e.target.value)}
                            className="input h-8 w-auto appearance-none pl-8 pr-8 text-[13px]"
                        >
                            <option value="">Tous les sites</option>
                            {data?.sites.map((s) => (
                                <option key={s.host} value={s.host}>
                                    {s.host}
                                </option>
                            ))}
                        </select>
                    </label>
                    <Tabs value={range} onChange={setRange} options={RANGES} />
                </div>
                <LiveIndicator updatedAt={updatedAt} error={error} />
            </div>

            {error && !data && <ErrorBanner>Impossible de joindre deploy-agent.</ErrorBanner>}

            <div className={`grid grid-cols-2 gap-3 lg:grid-cols-5 ${stale ? "opacity-60" : ""}`}>
                {!t ? (
                    [0, 1, 2, 3, 4].map((i) => (
                        <div key={i} className="card space-y-3 p-4">
                            <Skeleton className="h-3.5 w-24" />
                            <Skeleton className="h-7 w-16" />
                            <Skeleton className="h-3 w-32" />
                        </div>
                    ))
                ) : (
                    <>
                        <Kpi
                            label="Visiteurs"
                            icon={Users}
                            value={nf.format(t.visitors)}
                            footer={<Delta now={t.visitors} before={data.previous.visitors} />}
                        />
                        <Kpi
                            label="Pages vues"
                            icon={Eye}
                            value={nf.format(t.pageviews)}
                            footer={<Delta now={t.pageviews} before={data.previous.pageviews} />}
                        />
                        <Kpi
                            label="Requêtes"
                            icon={Zap}
                            value={nf.format(t.requests)}
                            footer={
                                <span className="text-xs text-fg-subtle">
                                    {formatBytes(t.bytes)} servis · {nf.format(t.bots)} robots écartés
                                </span>
                            }
                        />
                        <Kpi
                            label="Temps de réponse"
                            icon={Gauge}
                            value={t.avgMs === null ? "—" : `${nf.format(t.avgMs)} ms`}
                            footer={
                                <span className="text-xs text-fg-subtle">
                                    {t.p95Ms === null ? "moyenne" : `95 % sous ${nf.format(t.p95Ms)} ms`}
                                </span>
                            }
                        />
                        <div className="col-span-2 lg:col-span-1">
                            <Kpi
                                label="Erreurs serveur"
                                icon={AlertTriangle}
                                value={formatPercent(t.errorRate, 2)}
                                footer={
                                    <span className="text-xs text-fg-subtle">
                                        {nf.format(data.statuses["5xx"] ?? 0)} réponses 5xx
                                    </span>
                                }
                            />
                        </div>
                    </>
                )}
            </div>

            <Panel
                title="Fréquentation"
                description={host || "Tous les sites"}
                actions={
                    <div className="flex items-center gap-4 text-xs text-fg-muted">
                        <span className="flex items-center gap-1.5">
                            <span className="h-2 w-2 rounded-full bg-accent-fg" /> Visiteurs
                        </span>
                        <span className="flex items-center gap-1.5">
                            <span className="h-0.5 w-3 rounded bg-pink" /> Pages vues
                        </span>
                    </div>
                }
                bodyClassName="px-4 pb-4 pt-5"
            >
                {data ? (
                    <AreaChart points={data.series} bucket={data.bucket} />
                ) : (
                    <Skeleton className="h-56 w-full" />
                )}
            </Panel>

            <div className="grid gap-6 lg:grid-cols-2">
                <Panel title="Pages les plus vues" description="Visiteurs uniques par page">
                    {data ? (
                        <BarList
                            empty="Aucune page vue sur la période"
                            items={data.topPages.map((p) => ({
                                key: `${p.host}${p.path}`,
                                value: p.pageviews,
                                label: (
                                    <>
                                        <span className="font-mono text-xs">{p.path}</span>
                                        {!host && <span className="ml-2 text-xs text-fg-subtle">{p.host}</span>}
                                    </>
                                ),
                            }))}
                        />
                    ) : (
                        <Skeleton className="m-4 h-40" />
                    )}
                </Panel>

                <Panel title="Sources" description="D'où arrivent les visiteurs">
                    {data ? (
                        <BarList
                            empty="Aucune donnée"
                            items={data.referrers.map((r) => ({
                                key: r.name,
                                value: r.visitors,
                                label: (
                                    <span className="flex items-center gap-2">
                                        <Link2 className="h-3.5 w-3.5 shrink-0 text-fg-subtle" />
                                        {r.name}
                                    </span>
                                ),
                            }))}
                        />
                    ) : (
                        <Skeleton className="m-4 h-40" />
                    )}
                </Panel>

                <Panel
                    title="Technologies"
                    description="Navigateurs, systèmes et appareils"
                    actions={
                        <Tabs
                            value={tech}
                            onChange={setTech}
                            options={[
                                { key: "browsers", label: "Navigateurs" },
                                { key: "os", label: "Systèmes" },
                                { key: "devices", label: "Appareils" },
                            ]}
                        />
                    }
                >
                    {data ? (
                        <BarList
                            empty="Aucune donnée"
                            items={data[tech].map((r) => ({
                                key: r.name,
                                value: r.visitors,
                                label: (
                                    <span className="flex items-center gap-2">
                                        <MonitorSmartphone className="h-3.5 w-3.5 shrink-0 text-fg-subtle" />
                                        {r.name}
                                    </span>
                                ),
                            }))}
                        />
                    ) : (
                        <Skeleton className="m-4 h-40" />
                    )}
                </Panel>

                <Panel title="Réponses HTTP" description="Hors robots">
                    {data ? (
                        <div className="space-y-4 p-4">
                            <div className="flex h-2.5 overflow-hidden rounded-full bg-line">
                                {(["2xx", "3xx", "4xx", "5xx"] as const).map((k) => (
                                    <div
                                        key={k}
                                        className={{ "2xx": "bg-accent", "3xx": "bg-info", "4xx": "bg-warn", "5xx": "bg-down" }[k]}
                                        style={{ width: `${statusTotal ? ((data.statuses[k] ?? 0) / statusTotal) * 100 : 0}%` }}
                                    />
                                ))}
                            </div>
                            <dl className="grid grid-cols-2 gap-3 text-[13px] sm:grid-cols-4">
                                {(
                                    [
                                        ["2xx", "Succès", "bg-accent"],
                                        ["3xx", "Redirections", "bg-info"],
                                        ["4xx", "Introuvables", "bg-warn"],
                                        ["5xx", "Erreurs", "bg-down"],
                                    ] as const
                                ).map(([k, name, color]) => (
                                    <div key={k}>
                                        <dt className="flex items-center gap-1.5 text-xs text-fg-subtle">
                                            <span className={`h-2 w-2 rounded-full ${color}`} /> {name}
                                        </dt>
                                        <dd className="tabular mt-0.5 font-medium text-fg">{nf.format(data.statuses[k] ?? 0)}</dd>
                                    </div>
                                ))}
                            </dl>

                            <div className="border-t border-line pt-3">
                                <p className="mb-2 text-xs font-medium text-fg-muted">Erreurs les plus fréquentes</p>
                                {data.errors.length === 0 ? (
                                    <p className="text-[13px] text-fg-subtle">Aucune erreur sur la période.</p>
                                ) : (
                                    <ul className="space-y-1.5">
                                        {data.errors.slice(0, 5).map((e) => (
                                            <li key={`${e.host}${e.path}${e.status}`} className="flex items-center gap-2 text-xs">
                                                <span
                                                    className={`tabular w-9 shrink-0 rounded px-1 text-center font-mono ${
                                                        e.status >= 500 ? "bg-down/15 text-down" : "bg-warn/15 text-warn"
                                                    }`}
                                                >
                                                    {e.status}
                                                </span>
                                                <span className="min-w-0 flex-1 truncate font-mono text-fg-muted" title={`${e.host}${e.path}`}>
                                                    {!host && <span className="text-fg-subtle">{e.host}</span>}
                                                    {e.path}
                                                </span>
                                                <span className="tabular shrink-0 text-fg-subtle">
                                                    ×{e.count} · {timeAgo(e.last)}
                                                </span>
                                            </li>
                                        ))}
                                    </ul>
                                )}
                            </div>
                        </div>
                    ) : (
                        <Skeleton className="m-4 h-40" />
                    )}
                </Panel>
            </div>

            <Panel title="Par site" description="Tous les sites servis par Traefik sur la période">
                {!data ? (
                    <Skeleton className="m-4 h-32" />
                ) : data.sites.length === 0 ? (
                    <EmptyState icon={Globe} title="Pas encore de données">
                        Les journaux de Traefik sont lus chaque minute.
                    </EmptyState>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-[13px]">
                            <thead className="text-xs text-fg-subtle">
                                <tr className="border-b border-line">
                                    <th className="px-4 py-2.5 font-medium">Site</th>
                                    <th className="px-4 py-2.5 text-right font-medium">Visiteurs</th>
                                    <th className="px-4 py-2.5 text-right font-medium">Pages vues</th>
                                    <th className="hidden px-4 py-2.5 text-right font-medium sm:table-cell">Requêtes</th>
                                    <th className="hidden px-4 py-2.5 text-right font-medium md:table-cell">Erreurs 5xx</th>
                                    <th className="hidden px-4 py-2.5 text-right font-medium md:table-cell">Temps moyen</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-line">
                                {data.sites.map((s) => (
                                    <tr
                                        key={s.host}
                                        onClick={() => setHost(s.host === host ? "" : s.host)}
                                        className={`cursor-pointer transition-colors hover:bg-accent/5 ${s.host === host ? "bg-accent/10" : ""}`}
                                    >
                                        <td className="px-4 py-2.5 font-mono text-xs text-fg">{s.host}</td>
                                        <td className="tabular px-4 py-2.5 text-right text-fg">{nf.format(s.visitors)}</td>
                                        <td className="tabular px-4 py-2.5 text-right text-fg-muted">{nf.format(s.pageviews)}</td>
                                        <td className="tabular hidden px-4 py-2.5 text-right text-fg-muted sm:table-cell">
                                            {nf.format(s.requests)}
                                        </td>
                                        <td className={`tabular hidden px-4 py-2.5 text-right md:table-cell ${s.errors ? "text-down" : "text-fg-subtle"}`}>
                                            {nf.format(s.errors)}
                                        </td>
                                        <td className="tabular hidden px-4 py-2.5 text-right text-fg-muted md:table-cell">
                                            {s.avgMs === null ? "—" : `${nf.format(s.avgMs)} ms`}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </Panel>

            <p className="flex items-start gap-2 text-xs text-fg-subtle">
                <ShieldCheck className="mt-px h-3.5 w-3.5 shrink-0 text-accent-fg" />
                Mesuré côté serveur depuis les journaux de Traefik : aucun script ni cookie dans les sites. Les adresses IP ne
                sont jamais enregistrées ; un visiteur est une empreinte anonyme renouvelée chaque jour. Robots et scanners
                exclus.
                {data?.lastIngestAt && ` Dernière lecture du journal ${timeAgo(data.lastIngestAt)}.`}
            </p>
        </div>
    );
}
