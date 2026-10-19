"use client";

import { ChevronRight, HardDrive } from "lucide-react";

type Crumb = { id: string | null; name: string };

export function Breadcrumb({
    crumbs,
    onNavigate,
}: {
    crumbs: Crumb[];
    onNavigate: (id: string | null) => void;
}) {
    return (
        <nav aria-label="Emplacement" className="flex min-w-0 items-center gap-1 text-[13px]">
            {crumbs.map((crumb, i) => {
                const isLast = i === crumbs.length - 1;
                return (
                    <span key={crumb.id ?? "root"} className="flex min-w-0 items-center gap-1">
                        {i > 0 && <ChevronRight aria-hidden className="h-3.5 w-3.5 shrink-0 text-fg-subtle/60" />}
                        {isLast ? (
                            <span aria-current="page" className="flex min-w-0 items-center gap-1.5 truncate px-1.5 font-medium text-fg">
                                {i === 0 && <HardDrive className="h-3.5 w-3.5 shrink-0 text-fg-subtle" />}
                                <span className="truncate">{crumb.name}</span>
                            </span>
                        ) : (
                            <button
                                type="button"
                                onClick={() => onNavigate(crumb.id)}
                                className="flex min-w-0 items-center gap-1.5 truncate rounded px-1.5 py-0.5 text-fg-muted transition-colors hover:bg-elevated hover:text-fg"
                            >
                                {i === 0 && <HardDrive className="h-3.5 w-3.5 shrink-0" />}
                                <span className="truncate">{crumb.name}</span>
                            </button>
                        )}
                    </span>
                );
            })}
        </nav>
    );
}
