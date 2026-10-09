"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Brand } from "./brand";
import { navItems } from "./nav-items";
import { SignOutButton } from "./sign-out-button";

/** Navigation desktop (lg+). Sur mobile c'est `MobileNav` qui prend le relais. */
export function Sidebar({ email }: { email: string }) {
    const pathname = usePathname();

    return (
        <aside className="hidden w-64 shrink-0 flex-col border-r border-hairline bg-ink/80 backdrop-blur-xl lg:flex">
            <div className="px-5 py-6">
                <Brand />
            </div>

            <nav aria-label="Navigation principale" className="flex-1 px-3">
                <p className="eyebrow mb-3 px-3">Modules</p>
                <ul className="flex flex-col gap-1">
                    {navItems.map(({ label, href, icon: Icon, available }) => {
                        const isActive = pathname === href;

                        if (!available) {
                            return (
                                <li key={href}>
                                    {/* Pas un lien : la route n'existe pas encore. */}
                                    <span
                                        aria-disabled="true"
                                        className="flex cursor-not-allowed items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-text-muted/60"
                                    >
                                        <Icon className="h-5 w-5 shrink-0" />
                                        <span className="flex-1">{label}</span>
                                        <span className="rounded-full border border-hairline px-2 py-0.5 font-mono text-[9px] uppercase tracking-wider">
                                            Bientôt
                                        </span>
                                    </span>
                                </li>
                            );
                        }

                        return (
                            <li key={href}>
                                <Link
                                    href={href}
                                    aria-current={isActive ? "page" : undefined}
                                    className={`group relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition-colors ${
                                        isActive
                                            ? "bg-glass text-text-main"
                                            : "text-text-muted hover:bg-glass/60 hover:text-text-main"
                                    }`}
                                >
                                    {/* Liseré or : marqueur d'état actif du portfolio. */}
                                    <span
                                        aria-hidden="true"
                                        className={`absolute left-0 top-1/2 h-5 w-[2px] -translate-y-1/2 rounded-full bg-gold transition-opacity ${
                                            isActive ? "opacity-100" : "opacity-0"
                                        }`}
                                    />
                                    <Icon
                                        className={`h-5 w-5 shrink-0 transition-colors ${
                                            isActive
                                                ? "text-gold"
                                                : "group-hover:text-mauve-text"
                                        }`}
                                    />
                                    <span className="font-medium">{label}</span>
                                </Link>
                            </li>
                        );
                    })}
                </ul>
            </nav>

            <div className="border-t border-hairline p-4">
                <p className="eyebrow mb-1.5">Session</p>
                <p
                    className="mb-3 truncate font-mono text-[11px] text-text-muted"
                    title={email}
                >
                    {email}
                </p>
                <SignOutButton />
            </div>
        </aside>
    );
}
