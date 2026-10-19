import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { PageHeader } from "../_components/ui";
import { AnalyticsView } from "./_components/analytics-view";

export const metadata: Metadata = { title: "Analytics" };

export default async function AnalyticsPage() {
    const session = await auth();
    if (!session) redirect("/login");

    return (
        <>
            <PageHeader
                eyebrow="Services"
                title="Analytics"
                description="Fréquentation de tous les sites servis par le VPS, mesurée côté serveur, sans traceur ni cookie."
            />
            <AnalyticsView />
        </>
    );
}
