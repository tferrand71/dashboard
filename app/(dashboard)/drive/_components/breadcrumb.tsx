"use client";

type Crumb = { id: string | null; name: string };

export function Breadcrumb({
    crumbs,
    onNavigate,
}: {
    crumbs: Crumb[];
    onNavigate: (id: string | null) => void;
}) {
    return (
        <nav aria-label="Fil d'Ariane" className="flex items-center gap-1.5 font-mono text-xs">
            {crumbs.map((crumb, i) => {
                const isLast = i === crumbs.length - 1;
                return (
                    <span key={crumb.id ?? "root"} className="flex items-center gap-1.5">
                        {i > 0 && (
                            <span aria-hidden className="text-text-muted/40">
                                /
                            </span>
                        )}
                        {isLast ? (
                            <span className="text-text-main">{crumb.name}</span>
                        ) : (
                            <button
                                onClick={() => onNavigate(crumb.id)}
                                className="text-text-muted transition-colors hover:text-mauve-text"
                            >
                                {crumb.name}
                            </button>
                        )}
                    </span>
                );
            })}
        </nav>
    );
}
