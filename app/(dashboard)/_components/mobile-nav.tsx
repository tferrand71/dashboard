"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { navItems } from "./nav-items";

/**
 * Barre basse flottante — visible sous `lg` uniquement.
 * Choisie plutôt qu'un menu rétractable : quatre entrées tiennent dans
 * la zone du pouce, et consulter l'infra d'un coup d'œil ne doit pas
 * coûter un tap d'ouverture de menu.
 */
export function MobileNav() {
    const pathname = usePathname();

    return (
        <nav
            aria-label="Navigation principale"
            className="fixed inset-x-0 bottom-0 z-40 lg:hidden"
        >
            {/* Dégradé de fond : le contenu qui défile ne vient pas se coller
                sous la barre de façon illisible. */}
            <div
                aria-hidden="true"
                className="pointer-events-none h-8 bg-gradient-to-t from-midnight to-transparent"
            />
            <div className="border-t border-hairline bg-glass-strong px-3 pb-[max(0.5rem,env(safe-area-inset-bottom))] pt-2 backdrop-blur-xl">
                <ul className="mx-auto flex max-w-md items-stretch justify-between gap-1">
                    {navItems.map(({ label, href, icon: Icon, available }) => {
                        const isActive = pathname === href;

                        if (!available) {
                            return (
                                <li key={href} className="flex-1">
                                    <span
                                        aria-disabled="true"
                                        className="relative flex min-h-11 cursor-not-allowed flex-col items-center justify-center gap-1 rounded-xl py-1.5 text-text-muted/50"
                                    >
                                        <Icon className="h-5 w-5" />
                                        <span className="text-[10px] font-medium">
                                            {label}
                                        </span>
                                        {/* Point or = « pas encore construit », repris
                                            du libellé « Bientôt » ailleurs. */}
                                        <span
                                            aria-hidden="true"
                                            className="absolute right-1.5 top-1 h-1.5 w-1.5 rounded-full bg-gold/50"
                                        />
                                        <span className="sr-only">— bientôt disponible</span>
                                    </span>
                                </li>
                            );
                        }

                        return (
                            <li key={href} className="flex-1">
                                <Link
                                    href={href}
                                    aria-current={isActive ? "page" : undefined}
                                    className={`flex min-h-11 flex-col items-center justify-center gap-1 rounded-xl py-1.5 transition-colors ${
                                        isActive
                                            ? "bg-glass text-gold"
                                            : "text-text-muted active:bg-glass/60"
                                    }`}
                                >
                                    <Icon className="h-5 w-5" />
                                    <span className="text-[10px] font-semibold">{label}</span>
                                </Link>
                            </li>
                        );
                    })}
                </ul>
            </div>
        </nav>
    );
}
