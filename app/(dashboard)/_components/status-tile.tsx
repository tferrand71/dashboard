import type { ComponentType, ReactNode } from "react";

export type TileState = "ok" | "warn" | "down" | "neutral";

const dotColor: Record<TileState, string> = {
    ok: "bg-ok",
    warn: "bg-warn",
    down: "bg-down",
    neutral: "bg-text-muted",
};

const dotGlow: Record<TileState, string> = {
    ok: "shadow-[0_0_10px_var(--color-ok)]",
    warn: "shadow-[0_0_10px_var(--color-warn)]",
    down: "shadow-[0_0_10px_var(--color-down)]",
    neutral: "",
};

type Props = {
    label: string;
    value: string;
    detail?: ReactNode;
    state: TileState;
    icon: ComponentType<{ className?: string }>;
};

export function StatusTile({
    label,
    value,
    detail,
    state,
    icon: Icon,
}: Props) {
    return (
        <div className="glass-panel group rounded-2xl p-4 transition-colors hover:border-hairline-strong sm:p-5">
            <div className="mb-3 flex items-center justify-between gap-2">
                <span className="flex items-center gap-2 text-text-muted">
                    <Icon className="h-4 w-4" />
                    <span className="text-[10px] font-bold uppercase tracking-[0.18em]">
                        {label}
                    </span>
                </span>
                <span
                    aria-hidden="true"
                    className={`h-2 w-2 shrink-0 rounded-full ${dotColor[state]} ${dotGlow[state]} ${
                        state === "ok" ? "animate-pulse-dot" : ""
                    }`}
                />
            </div>

            <p className="truncate font-serif text-xl font-bold tracking-tight text-text-main sm:text-2xl">
                {value}
            </p>

            {detail && (
                <div className="mt-1.5 font-mono text-[11px] leading-relaxed text-text-muted">
                    {detail}
                </div>
            )}
        </div>
    );
}

export function StatusTileSkeleton() {
    return (
        <div className="glass-panel rounded-2xl p-4 sm:p-5">
            <div className="mb-3 flex items-center justify-between">
                <div className="skeleton h-3 w-24 rounded-full" />
                <div className="skeleton h-2 w-2 rounded-full" />
            </div>
            <div className="skeleton h-6 w-32 rounded-md" />
            <div className="skeleton mt-2 h-3 w-20 rounded-full" />
        </div>
    );
}
