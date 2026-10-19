"use client";

import { useMemo, useRef, useState } from "react";

export type Point = { t: string; pageviews: number; visitors: number };

const W = 800;
const H = 220;
const PAD = { top: 12, right: 8, bottom: 24, left: 36 };

function niceMax(v: number): number {
    if (v <= 5) return 5;
    const exp = 10 ** Math.floor(Math.log10(v));
    const n = v / exp;
    const step = [1, 1.2, 1.5, 2, 2.5, 3, 4, 5, 6, 8, 10].find((s) => n <= s) ?? 10;
    return step * exp;
}

function label(t: string, bucket: "hour" | "day"): string {
    const d = new Date(`${t}:00`);
    return bucket === "hour"
        ? `${d.getHours()} h`
        : d.toLocaleDateString("fr-FR", { day: "numeric", month: "short" });
}

/** Courbes visiteurs (plein, violet) + pages vues (trait, rose), avec info-bulle au survol. */
export function AreaChart({ points, bucket }: { points: Point[]; bucket: "hour" | "day" }) {
    const ref = useRef<SVGSVGElement>(null);
    const [hover, setHover] = useState<number | null>(null);

    const { max, x, y, visitorsPath, visitorsArea, pageviewsPath, ticks } = useMemo(() => {
        const max = niceMax(Math.max(1, ...points.map((p) => Math.max(p.pageviews, p.visitors))));
        const innerW = W - PAD.left - PAD.right;
        const innerH = H - PAD.top - PAD.bottom;
        const step = points.length > 1 ? innerW / (points.length - 1) : 0;
        const x = (i: number) => PAD.left + i * step;
        const y = (v: number) => PAD.top + innerH - (v / max) * innerH;
        const line = (key: "visitors" | "pageviews") =>
            points.map((p, i) => `${i ? "L" : "M"}${x(i).toFixed(1)},${y(p[key]).toFixed(1)}`).join(" ");
        const visitorsPath = line("visitors");
        const visitorsArea = points.length
            ? `${visitorsPath} L${x(points.length - 1)},${y(0)} L${x(0)},${y(0)} Z`
            : "";
        const every = Math.max(1, Math.ceil(points.length / 7));
        const ticks = points.map((p, i) => ({ i, t: p.t })).filter(({ i }) => i % every === 0);
        return { max, x, y, visitorsPath, visitorsArea, pageviewsPath: line("pageviews"), ticks };
    }, [points]);

    function onMove(e: React.MouseEvent) {
        const svg = ref.current;
        if (!svg || points.length < 2) return;
        const rect = svg.getBoundingClientRect();
        const px = ((e.clientX - rect.left) / rect.width) * W;
        const i = Math.round(((px - PAD.left) / (W - PAD.left - PAD.right)) * (points.length - 1));
        setHover(Math.min(points.length - 1, Math.max(0, i)));
    }

    const hp = hover !== null ? points[hover] : null;

    return (
        <div className="relative">
            <svg
                ref={ref}
                viewBox={`0 0 ${W} ${H}`}
                className="block h-56 w-full"
                preserveAspectRatio="none"
                onMouseMove={onMove}
                onMouseLeave={() => setHover(null)}
                role="img"
                aria-label="Évolution des visiteurs et des pages vues"
            >
                <defs>
                    <linearGradient id="area-visitors" x1="0" x2="0" y1="0" y2="1">
                        <stop offset="0%" stopColor="#8b5cf6" stopOpacity="0.45" />
                        <stop offset="100%" stopColor="#8b5cf6" stopOpacity="0" />
                    </linearGradient>
                </defs>

                {[0, 0.25, 0.5, 0.75, 1].map((f) => (
                    <g key={f}>
                        <line
                            x1={PAD.left}
                            x2={W - PAD.right}
                            y1={y(max * f)}
                            y2={y(max * f)}
                            stroke="var(--color-line)"
                            strokeDasharray={f === 0 ? undefined : "3 4"}
                            vectorEffect="non-scaling-stroke"
                        />
                    </g>
                ))}

                <path d={visitorsArea} fill="url(#area-visitors)" />
                <path d={visitorsPath} fill="none" stroke="#a78bfa" strokeWidth="2" vectorEffect="non-scaling-stroke" strokeLinejoin="round" />
                <path
                    d={pageviewsPath}
                    fill="none"
                    stroke="#ec4899"
                    strokeWidth="1.5"
                    strokeDasharray="4 3"
                    vectorEffect="non-scaling-stroke"
                    strokeLinejoin="round"
                />

                {hover !== null && hp && (
                    <g>
                        <line
                            x1={x(hover)}
                            x2={x(hover)}
                            y1={PAD.top}
                            y2={H - PAD.bottom}
                            stroke="var(--color-line-strong)"
                            vectorEffect="non-scaling-stroke"
                        />
                    </g>
                )}
            </svg>

            {/* Libellés et points en HTML : le SVG est étiré (preserveAspectRatio none) */}
            {[0, 0.5, 1].map((f) => (
                <span
                    key={f}
                    className="tabular pointer-events-none absolute -translate-y-1/2 text-[10px] text-fg-subtle"
                    style={{ left: 0, width: `${((PAD.left - 8) / W) * 100}%`, top: `${(y(max * f) / H) * 100}%`, textAlign: "right" }}
                >
                    {Math.round(max * f)}
                </span>
            ))}
            {ticks.map(({ i, t }) => (
                <span
                    key={t}
                    className="pointer-events-none absolute bottom-0 -translate-x-1/2 whitespace-nowrap text-[10px] text-fg-subtle"
                    style={{ left: `${(x(i) / W) * 100}%` }}
                >
                    {label(t, bucket)}
                </span>
            ))}
            {hover !== null && hp && (
                <>
                    <span
                        className="pointer-events-none absolute h-2.5 w-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-accent-fg ring-2 ring-surface"
                        style={{ left: `${(x(hover) / W) * 100}%`, top: `${(y(hp.visitors) / H) * 100}%` }}
                    />
                    <span
                        className="pointer-events-none absolute h-2 w-2 -translate-x-1/2 -translate-y-1/2 rounded-full bg-pink ring-2 ring-surface"
                        style={{ left: `${(x(hover) / W) * 100}%`, top: `${(y(hp.pageviews) / H) * 100}%` }}
                    />
                </>
            )}
            {hover !== null && hp && (
                <div
                    className="pointer-events-none absolute top-2 z-10 min-w-36 rounded-md border border-line-strong bg-elevated px-3 py-2 text-xs shadow-xl shadow-black/40"
                    style={{
                        left: `${(x(hover) / W) * 100}%`,
                        transform: hover > points.length / 2 ? "translateX(calc(-100% - 12px))" : "translateX(12px)",
                    }}
                >
                    <p className="mb-1 font-medium text-fg">
                        {bucket === "hour"
                            ? new Date(`${hp.t}:00`).toLocaleString("fr-FR", { weekday: "short", hour: "2-digit", minute: "2-digit" })
                            : new Date(`${hp.t}:00`).toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long" })}
                    </p>
                    <p className="tabular flex justify-between gap-4 text-fg-muted">
                        <span className="flex items-center gap-1.5">
                            <span className="h-2 w-2 rounded-full bg-accent-fg" /> Visiteurs
                        </span>
                        <span className="text-fg">{hp.visitors}</span>
                    </p>
                    <p className="tabular flex justify-between gap-4 text-fg-muted">
                        <span className="flex items-center gap-1.5">
                            <span className="h-2 w-2 rounded-full bg-pink" /> Pages vues
                        </span>
                        <span className="text-fg">{hp.pageviews}</span>
                    </p>
                </div>
            )}
        </div>
    );
}
