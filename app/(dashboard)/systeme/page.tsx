import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { PageHeader } from "../_components/ui";
import { SystemMonitor } from "./_components/system-monitor";

export const metadata: Metadata = { title: "Système" };

export default async function SystemePage() {
    const session = await auth();
    if (!session) redirect("/login");

    return (
        <>
            <PageHeader
                eyebrow="Infrastructure"
                title="Système"
                description="Ressources du VPS et consommation de chaque conteneur Docker, actualisées toutes les 5 secondes."
            />
            <SystemMonitor />
        </>
    );
}
