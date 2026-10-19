import type { Metadata } from "next";
import { Suspense } from "react";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { getGreeting } from "@/lib/format";
import { OverviewLive } from "./_components/overview-live";
import { ServiceHealth, ServiceHealthSkeleton } from "./_components/service-health";
import { BrandText, PageHeader } from "./_components/ui";

export const metadata: Metadata = { title: "Vue d'ensemble" };

export default async function DashboardHome() {
    const session = await auth();

    // Le layout garantit déjà la session ; ce garde-fou rend le type sûr
    // et couvre le cas d'une expiration entre les deux rendus.
    if (!session?.user?.email) {
        redirect("/login");
    }

    return (
        <>
            <PageHeader
                eyebrow="Vue d'ensemble"
                title={
                    <>
                        {getGreeting()}, <BrandText>Tobias</BrandText>
                    </>
                }
                description="État de l'infrastructure auto-hébergée : VPS OVH, Docker, Traefik et PostgreSQL."
            />

            <OverviewLive
                health={
                    <Suspense fallback={<ServiceHealthSkeleton />}>
                        <ServiceHealth email={session.user.email} />
                    </Suspense>
                }
            />
        </>
    );
}
