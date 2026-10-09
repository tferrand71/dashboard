import type { ReactNode } from "react";

/** En-tête de section : micro-label or + filet, comme sur le portfolio. */
export function Section({
    eyebrow,
    title,
    aside,
    children,
}: {
    eyebrow: string;
    title: string;
    aside?: ReactNode;
    children: ReactNode;
}) {
    return (
        <section className="mt-10 sm:mt-12">
            <div className="mb-4 flex flex-wrap items-end justify-between gap-x-4 gap-y-1">
                <div>
                    <p className="eyebrow">{eyebrow}</p>
                    <h2 className="mt-1 font-serif text-lg font-bold tracking-tight text-text-main sm:text-xl">
                        {title}
                    </h2>
                </div>
                {aside && (
                    <p className="font-mono text-[11px] text-text-muted">{aside}</p>
                )}
            </div>
            <div
                aria-hidden="true"
                className="mb-5 h-px bg-gradient-to-r from-hairline-strong to-transparent"
            />
            {children}
        </section>
    );
}
