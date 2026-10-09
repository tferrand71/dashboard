"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { SignOutButton } from "./sign-out-button";

type NavItem = {
    label: string;
    href: string;
    available: boolean;
};

const navItems: NavItem[] = [
    { label: "Accueil", href: "/", available: true },
    { label: "Conteneurs", href: "/conteneurs", available: false },
    { label: "Analytics", href: "/analytics", available: false },
    { label: "Drive", href: "/drive", available: false },
];

export function Sidebar({ email }: { email: string }) {
    const pathname = usePathname();

    return (
        <aside className="flex h-full w-60 flex-col border-r border-line bg-surface">
            <div className="flex items-center gap-3 border-b border-line px-5 py-5">
                <div className="flex h-8 w-8 items-center justify-center rounded-sm bg-accent-soft font-mono text-sm text-accent">
                    TF
                </div>
                <div className="leading-tight">
                    <p className="text-sm font-medium text-text-primary">tobias-ferrand.fr</p>
                    <p className="text-xs text-text-secondary">infrastructure</p>
                </div>
            </div>

            <nav className="flex flex-1 flex-col gap-1 px-3 py-4">
                {navItems.map((item) => {
                    const isActive = pathname === item.href;

                    if (!item.available) {
                        return (
                            <div
                                key={item.href}
                                className="flex items-center justify-between rounded-sm px-3 py-2 text-sm text-text-secondary"
                            >
                                <span>{item.label}</span>
                                <span className="rounded-sm border border-line px-1.5 py-0.5 font-mono text-[11px] text-text-secondary">
                                    Bientôt
                                </span>
                            </div>
                        );
                    }

                    return (
                        <Link
                            key={item.href}
                            href={item.href}
                            className={`rounded-sm px-3 py-2 text-sm transition-colors ${
                                isActive
                                    ? "bg-accent-soft text-text-primary"
                                    : "text-text-secondary hover:bg-accent-soft/60 hover:text-text-primary"
                            }`}
                        >
                            {item.label}
                        </Link>
                    );
                })}
            </nav>

            <div className="border-t border-line px-5 py-4">
                <p className="truncate font-mono text-xs text-text-secondary">{email}</p>
                <div className="mt-2">
                    <SignOutButton />
                </div>
            </div>
        </aside>
    );
}
