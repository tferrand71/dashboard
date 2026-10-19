"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { ChevronRight, ExternalLink, Menu, X } from "lucide-react";
import { Brand } from "./brand";
import { isActive, navItems } from "./nav-items";
import { NavList, UserCard } from "./sidebar";

/**
 * Barre du haut : fil d'Ariane + environnement. Sous lg, elle porte aussi
 * le bouton du tiroir de navigation.
 */
export function Topbar({ email }: { email: string }) {
    const pathname = usePathname();
    const [open, setOpen] = useState(false);
    const current = navItems.find((item) => item.available && isActive(pathname, item.href));

    useEffect(() => {
        if (!open) return;
        const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
        document.addEventListener("keydown", onKey);
        document.body.style.overflow = "hidden";
        return () => {
            document.removeEventListener("keydown", onKey);
            document.body.style.overflow = "";
        };
    }, [open]);

    return (
        <>
            <header className="sticky top-0 z-30 flex h-14 items-center gap-3 border-b border-line bg-canvas/80 px-4 backdrop-blur-md sm:px-6 lg:px-8">
                <button
                    type="button"
                    onClick={() => setOpen(true)}
                    className="btn btn-ghost -ml-2 w-8 px-0 lg:hidden"
                    aria-label="Ouvrir la navigation"
                    aria-expanded={open}
                >
                    <Menu className="h-4 w-4" />
                </button>

                <nav aria-label="Fil d'Ariane" className="flex min-w-0 items-center gap-1.5 text-[13px]">
                    <span className="hidden text-fg-subtle sm:inline">VPS GRA</span>
                    <ChevronRight className="hidden h-3.5 w-3.5 text-fg-subtle/60 sm:block" />
                    <span className="truncate font-medium text-fg">{current?.label ?? "Console"}</span>
                </nav>

                <div className="ml-auto flex items-center gap-2">
                    <span className="hidden items-center gap-1.5 rounded-md border border-line px-2 py-1 text-[11px] text-fg-muted md:inline-flex">
                        <span className="h-1.5 w-1.5 rounded-full bg-ok" aria-hidden="true" />
                        Production · OVH Gravelines
                    </span>
                    <a
                        href="https://tobias-ferrand.fr"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="btn btn-ghost"
                    >
                        <span className="hidden sm:inline">Portfolio</span>
                        <ExternalLink className="h-3.5 w-3.5" />
                    </a>
                </div>
            </header>

            {open && (
                <div className="fixed inset-0 z-50 lg:hidden" role="dialog" aria-modal="true" aria-label="Navigation">
                    <button
                        type="button"
                        aria-label="Fermer la navigation"
                        onClick={() => setOpen(false)}
                        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
                    />
                    <div className="animate-fade-in absolute inset-y-0 left-0 flex w-72 max-w-[85vw] flex-col border-r border-line bg-surface">
                        <div className="flex h-14 items-center justify-between border-b border-line px-4">
                            <Brand />
                            <button
                                type="button"
                                onClick={() => setOpen(false)}
                                className="btn btn-ghost w-8 px-0"
                                aria-label="Fermer"
                            >
                                <X className="h-4 w-4" />
                            </button>
                        </div>
                        <div className="flex-1 overflow-y-auto px-3 py-4">
                            <NavList onNavigate={() => setOpen(false)} />
                        </div>
                        <div className="border-t border-line p-2">
                            <UserCard email={email} />
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}
