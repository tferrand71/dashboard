import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

/* ── En-tête de page ─────────────────────────────────────────── */

export function PageHeader({
    eyebrow,
    title,
    description,
    actions,
}: {
    eyebrow?: string;
    title: ReactNode;
    description?: ReactNode;
    actions?: ReactNode;
}) {
    return (
        <header className="animate-fade-in relative pb-6">
            <div className="flex flex-wrap items-end justify-between gap-4">
                <div className="min-w-0">
                    {eyebrow && <p className="mb-1.5 text-xs font-medium text-accent-fg">{eyebrow}</p>}
                    <h1 className="text-2xl font-semibold tracking-tight text-fg">{title}</h1>
                    {description && (
                        <p className="mt-1.5 max-w-2xl text-sm text-fg-muted">{description}</p>
                    )}
                </div>
                {actions && <div className="flex items-center gap-2">{actions}</div>}
            </div>
            {/* Filet violet → rose, signature du portfolio */}
            <div
                aria-hidden="true"
                className="absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-accent/60 via-pink/25 to-transparent"
            />
        </header>
    );
}

/** Texte en dégradé violet → rose (à utiliser avec parcimonie). */
export function BrandText({ children }: { children: ReactNode }) {
    return (
        <span className="bg-gradient-to-r from-accent-fg to-pink bg-clip-text text-transparent">{children}</span>
    );
}

/* ── Carte avec en-tête ──────────────────────────────────────── */

export function Panel({
    title,
    description,
    actions,
    children,
    className = "",
    bodyClassName = "",
}: {
    title: string;
    description?: ReactNode;
    actions?: ReactNode;
    children: ReactNode;
    className?: string;
    bodyClassName?: string;
}) {
    return (
        <section className={`card overflow-hidden ${className}`}>
            <div className="flex items-center justify-between gap-3 border-b border-line px-4 py-3">
                <div className="min-w-0">
                    <h2 className="text-sm font-semibold text-fg">{title}</h2>
                    {description && (
                        <p className="mt-0.5 truncate text-xs text-fg-subtle">{description}</p>
                    )}
                </div>
                {actions && <div className="flex shrink-0 items-center gap-2">{actions}</div>}
            </div>
            <div className={bodyClassName}>{children}</div>
        </section>
    );
}

/* ── Statuts ─────────────────────────────────────────────────── */

export type Tone = "ok" | "warn" | "down" | "info" | "neutral";

const toneText: Record<Tone, string> = {
    ok: "text-ok",
    warn: "text-warn",
    down: "text-down",
    info: "text-info",
    neutral: "text-fg-subtle",
};

const toneBg: Record<Tone, string> = {
    ok: "bg-ok",
    warn: "bg-warn",
    down: "bg-down",
    info: "bg-info",
    neutral: "bg-fg-subtle",
};

const toneBadge: Record<Tone, string> = {
    ok: "border-ok/25 bg-ok/10 text-ok",
    warn: "border-warn/25 bg-warn/10 text-warn",
    down: "border-down/25 bg-down/10 text-down",
    info: "border-info/25 bg-info/10 text-info",
    neutral: "border-line-strong bg-elevated text-fg-muted",
};

export function StatusDot({ tone, pulse = false }: { tone: Tone; pulse?: boolean }) {
    return (
        <span aria-hidden="true" className="relative inline-flex h-2 w-2 shrink-0">
            {pulse && (
                <span
                    className={`animate-ping-soft absolute inline-flex h-full w-full rounded-full opacity-60 ${toneBg[tone]}`}
                />
            )}
            <span className={`relative inline-flex h-2 w-2 rounded-full ${toneBg[tone]}`} />
        </span>
    );
}

export function Badge({
    tone = "neutral",
    children,
    dot = false,
}: {
    tone?: Tone;
    children: ReactNode;
    dot?: boolean;
}) {
    return (
        <span
            className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-full border px-2 py-0.5 text-[11px] font-medium ${toneBadge[tone]}`}
        >
            {dot && <StatusDot tone={tone} />}
            {children}
        </span>
    );
}

export const PROJECT_STATUS: Record<string, { label: string; tone: Tone }> = {
    RUNNING: { label: "En ligne", tone: "ok" },
    BUILDING: { label: "Build en cours", tone: "info" },
    FAILED: { label: "Échec", tone: "down" },
    IDLE: { label: "Jamais déployé", tone: "neutral" },
};

export function ProjectStatusBadge({ status }: { status: string }) {
    const s = PROJECT_STATUS[status] ?? { label: status, tone: "neutral" as Tone };
    return (
        <Badge tone={s.tone} dot>
            {s.label}
        </Badge>
    );
}

export function toneTextClass(tone: Tone): string {
    return toneText[tone];
}

/* ── Jauge horizontale ───────────────────────────────────────── */

/** `tone` ok → dégradé violet de la marque ; warn/down gardent leur couleur d'alerte. */
export function Meter({ percent, tone }: { percent: number; tone: Tone }) {
    const fill = tone === "ok" ? "bg-gradient-to-r from-accent to-pink/80" : toneBg[tone];
    return (
        <div
            role="meter"
            aria-valuenow={Math.round(percent)}
            aria-valuemin={0}
            aria-valuemax={100}
            className="h-1.5 w-full overflow-hidden rounded-full bg-line"
        >
            <div
                className={`h-full rounded-full transition-[width] duration-700 ${fill}`}
                style={{ width: `${Math.min(Math.max(percent, 0), 100)}%` }}
            />
        </div>
    );
}

/* ── Mini-graphique (historique en mémoire côté client) ──────── */

export function Sparkline({
    values,
    max = 100,
    className = "",
}: {
    values: number[];
    max?: number;
    className?: string;
}) {
    const width = 120;
    const height = 32;
    if (values.length < 2) {
        return <div className={`h-8 ${className}`} aria-hidden="true" />;
    }
    const step = width / (values.length - 1);
    const points = values.map((v, i) => {
        const y = height - (Math.min(v, max) / max) * (height - 2) - 1;
        return `${(i * step).toFixed(1)},${y.toFixed(1)}`;
    });
    const line = `M${points.join(" L")}`;
    const area = `${line} L${width},${height} L0,${height} Z`;

    return (
        <svg
            viewBox={`0 0 ${width} ${height}`}
            preserveAspectRatio="none"
            aria-hidden="true"
            className={`h-8 w-full overflow-visible text-accent-fg ${className}`}
        >
            <defs>
                <linearGradient id="spark-fill" x1="0" x2="0" y1="0" y2="1">
                    <stop offset="0%" stopColor="#8b5cf6" stopOpacity="0.35" />
                    <stop offset="100%" stopColor="#8b5cf6" stopOpacity="0" />
                </linearGradient>
                <linearGradient id="spark-stroke" x1="0" x2="1" y1="0" y2="0">
                    <stop offset="0%" stopColor="#8b5cf6" />
                    <stop offset="100%" stopColor="#ec4899" />
                </linearGradient>
            </defs>
            <path d={area} fill="url(#spark-fill)" />
            <path
                d={line}
                fill="none"
                stroke="url(#spark-stroke)"
                strokeWidth="1.5"
                vectorEffect="non-scaling-stroke"
                strokeLinejoin="round"
            />
        </svg>
    );
}

/* ── États vides / erreurs ───────────────────────────────────── */

export function EmptyState({
    icon: Icon,
    title,
    children,
    action,
}: {
    icon: LucideIcon;
    title: string;
    children?: ReactNode;
    action?: ReactNode;
}) {
    return (
        <div className="flex flex-col items-center px-6 py-12 text-center">
            <span className="flex h-10 w-10 items-center justify-center rounded-lg border border-line bg-elevated text-fg-subtle">
                <Icon className="h-5 w-5" strokeWidth={1.75} />
            </span>
            <p className="mt-4 text-sm font-medium text-fg">{title}</p>
            {children && <p className="mt-1 max-w-sm text-[13px] text-fg-muted">{children}</p>}
            {action && <div className="mt-5">{action}</div>}
        </div>
    );
}

export function ErrorBanner({ children }: { children: ReactNode }) {
    return (
        <p
            role="alert"
            className="rounded-md border border-down/25 bg-down/10 px-3 py-2 text-[13px] text-down"
        >
            {children}
        </p>
    );
}

export function Skeleton({ className = "" }: { className?: string }) {
    return <div className={`skeleton rounded ${className}`} />;
}

export function LiveIndicator({ updatedAt, error }: { updatedAt: Date | null; error?: string | null }) {
    if (error) {
        return (
            <span className="inline-flex items-center gap-2 text-xs text-down">
                <StatusDot tone="down" />
                {error}
            </span>
        );
    }
    return (
        <span className="inline-flex items-center gap-2 text-xs text-fg-subtle">
            <StatusDot tone={updatedAt ? "ok" : "neutral"} pulse={!!updatedAt} />
            <span className="tabular">
                {updatedAt
                    ? `En direct · ${updatedAt.toLocaleTimeString("fr-FR")}`
                    : "Connexion…"}
            </span>
        </span>
    );
}
