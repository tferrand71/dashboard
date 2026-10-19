import type { LucideIcon } from "lucide-react";
import { BarChart3, Boxes, Cpu, HardDrive, LayoutDashboard } from "lucide-react";

export type NavItem = {
    label: string;
    href: string;
    icon: LucideIcon;
    /** false = module pas encore construit, signalé « Bientôt » partout. */
    available: boolean;
};

export type NavGroup = { label: string; items: NavItem[] };

/** Source unique : la sidebar, le tiroir mobile et le fil d'Ariane lisent cette liste. */
export const navGroups: NavGroup[] = [
    {
        label: "Général",
        items: [{ label: "Vue d'ensemble", href: "/", icon: LayoutDashboard, available: true }],
    },
    {
        label: "Infrastructure",
        items: [
            { label: "Projets", href: "/conteneurs", icon: Boxes, available: true },
            { label: "Système", href: "/systeme", icon: Cpu, available: true },
        ],
    },
    {
        label: "Services",
        items: [
            { label: "Drive", href: "/drive", icon: HardDrive, available: true },
            { label: "Analytics", href: "/analytics", icon: BarChart3, available: true },
        ],
    },
];

export const navItems: NavItem[] = navGroups.flatMap((g) => g.items);

export function isActive(pathname: string, href: string): boolean {
    return href === "/" ? pathname === "/" : pathname === href || pathname.startsWith(`${href}/`);
}
