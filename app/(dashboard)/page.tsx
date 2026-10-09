import type { Metadata } from "next";
import { Suspense } from "react";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { getGreeting } from "@/lib/format";
import { ChartIcon, DriveIcon } from "./_components/icons";
import { ModuleCard } from "./_components/module-card";
import {
    ProjectsPanel,
    ProjectsPanelSkeleton,
} from "./_components/projects-panel";
import { Section } from "./_components/section";
import {
    ServiceHealth,
    ServiceHealthSkeleton,
} from "./_components/service-health";

export const metadata: Metadata = { title: "Accueil" };

const upcomingModules = [
    {
        title: "Analytics",
        description:
            "Fréquentation des sites servis par le VPS, mesurée côté serveur, sans traceur tiers.",
        icon: ChartIcon,
    },
    {
        title: "Drive personnel",
        description:
            "Déposer, organiser et partager des fichiers hébergés directement sur le VPS.",
        icon: DriveIcon,
    },
];

export default async function DashboardHome() {
    const session = await auth();

    // Le layout garantit déjà la session ; ce garde-fou rend le type sûr
    // et couvre le cas d'une expiration entre les deux rendus.
    if (!session?.user?.email) {
        redirect("/login");
    }

    return (
        <div className="mx-auto max-w-5xl">
            <header className="animate-rise">
                <p className="eyebrow">Tableau de bord</p>
                <h1 className="mt-2 font-serif text-3xl font-bold leading-[1.1] tracking-tight text-text-main sm:text-4xl">
                    {getGreeting()},{" "}
                    <span className="text-gradient-energetic">Tobias.</span>
                </h1>
                <p className="mt-3 max-w-md text-sm font-light leading-relaxed text-text-muted">
                    Vue d&apos;ensemble de l&apos;infrastructure auto-hébergée —
                    VPS OVH, Docker, Traefik.
                </p>
            </header>

            <Section eyebrow="Vérifié à l'instant" title="État du service">
                <Suspense fallback={<ServiceHealthSkeleton />}>
                    <ServiceHealth email={session.user.email} />
                </Suspense>
            </Section>

            <Section
                eyebrow="Base de données"
                title="Projets enregistrés"
                aside="table Project"
            >
                <Suspense fallback={<ProjectsPanelSkeleton />}>
                    <ProjectsPanel />
                </Suspense>
            </Section>

            <Section
                eyebrow="Feuille de route"
                title="Modules à construire"
                aside={`${upcomingModules.length} à venir`}
            >
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                    {upcomingModules.map((module) => (
                        <ModuleCard key={module.title} {...module} />
                    ))}
                </div>
            </Section>
        </div>
    );
}
