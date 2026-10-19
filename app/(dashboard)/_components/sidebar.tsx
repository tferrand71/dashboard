"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Brand } from "./brand";
import { isActive, navGroups } from "./nav-items";
import { SignOutButton } from "./sign-out-button";

/** Liste de navigation, partagée par la sidebar desktop et le tiroir mobile. */
export function NavList({ onNavigate }: { onNavigate?: () => void }) {
    const pathname = usePathname();

    return (
        <nav aria-label="Navigation principale" className="flex flex-col gap-5">
            {navGroups.map((group) => (
                <div key={group.label}>
                    <p className="mb-1 px-2 text-[11px] font-medium text-fg-subtle">{group.label}</p>
                    <ul className="flex flex-col gap-px">
                        {group.items.map(({ label, href, icon: Icon, available }) => {
                            if (!available) {
                                return (
                                    <li key={href}>
                                        {/* Pas un lien : la route n'existe pas encore. */}
                                        <span
                                            aria-disabled="true"
                                            className="flex h-8 cursor-not-allowed items-center gap-2.5 rounded-md px-2 text-[13px] text-fg-subtle/70"
                                        >
                                            <Icon className="h-4 w-4 shrink-0" strokeWidth={1.75} />
                                            <span className="flex-1">{label}</span>
                                            <span className="rounded border border-line px-1.5 text-[10px]">
                                                Bientôt
                                            </span>
                                        </span>
                                    </li>
                                );
                            }

                            const active = isActive(pathname, href);
                            return (
                                <li key={href}>
                                    <Link
                                        href={href}
                                        onClick={onNavigate}
                                        aria-current={active ? "page" : undefined}
                                        className={`relative flex h-8 items-center gap-2.5 rounded-md px-2 text-[13px] transition-colors ${
                                            active
                                                ? "bg-gradient-to-r from-accent/20 to-accent/5 font-medium text-fg shadow-[inset_0_0_0_1px_rgba(139,92,246,0.3)]"
                                                : "text-fg-muted hover:bg-accent/10 hover:text-fg"
                                        }`}
                                    >
                                        {active && (
                                            <span
                                                aria-hidden="true"
                                                className="absolute -left-3 top-1/2 h-4 w-[3px] -translate-y-1/2 rounded-r-full bg-accent shadow-[0_0_10px_var(--color-accent)]"
                                            />
                                        )}
                                        <Icon
                                            className={`h-4 w-4 shrink-0 ${active ? "text-accent-fg" : ""}`}
                                            strokeWidth={1.75}
                                        />
                                        {label}
                                    </Link>
                                </li>
                            );
                        })}
                    </ul>
                </div>
            ))}
        </nav>
    );
}

export function UserCard({ email }: { email: string }) {
    return (
        <div className="flex items-center gap-2.5 rounded-md p-1.5">
            <span
                aria-hidden="true"
                className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-accent/40 to-pink/30 text-[11px] font-semibold uppercase text-fg ring-1 ring-accent/40"
            >
                {email.slice(0, 1)}
            </span>
            <div className="min-w-0 flex-1">
                <p className="truncate text-[13px] font-medium text-fg">Administrateur</p>
                <p className="truncate text-[11px] text-fg-subtle" title={email}>
                    {email}
                </p>
            </div>
            <SignOutButton />
        </div>
    );
}

/** Navigation desktop (lg+). Sous lg, la barre du haut ouvre un tiroir. */
export function Sidebar({ email }: { email: string }) {
    return (
        <aside className="sticky top-0 hidden h-screen w-60 shrink-0 flex-col border-r border-line bg-surface/60 backdrop-blur-xl lg:flex">
            <div className="flex h-14 items-center border-b border-line px-4">
                <Brand />
            </div>

            <div className="flex-1 overflow-y-auto px-3 py-4">
                <NavList />
            </div>

            <div className="border-t border-line p-2">
                <UserCard email={email} />
            </div>
        </aside>
    );
}
