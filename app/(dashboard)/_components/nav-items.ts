import type { ComponentType } from "react";
import { ChartIcon, ContainerIcon, DriveIcon, HomeIcon } from "./icons";

export type NavItem = {
    label: string;
    href: string;
    icon: ComponentType<{ className?: string }>;
    /** false = module pas encore construit, signalé « Bientôt » partout. */
    available: boolean;
};

/** Source unique : la sidebar desktop et la barre mobile lisent cette liste. */
export const navItems: NavItem[] = [
    { label: "Accueil", href: "/", icon: HomeIcon, available: true },
    {
        label: "Conteneurs",
        href: "/conteneurs",
        icon: ContainerIcon,
        available: true,
    },
    { label: "Analytics", href: "/analytics", icon: ChartIcon, available: false },
    { label: "Drive", href: "/drive", icon: DriveIcon, available: false },
];
