import type { Metadata } from "next";
import { Suspense } from "react";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { PageHeader } from "../_components/ui";
import { DriveClient } from "./_components/drive-client";

export const metadata: Metadata = { title: "Drive" };

export default async function DrivePage() {
    const session = await auth();
    if (!session) redirect("/login");

    return (
        <>
            <PageHeader
                eyebrow="Services"
                title="Drive"
                description="Fichiers personnels stockés sur le VPS. Clic droit ou « … » sur un élément pour le renommer ou le supprimer."
            />
            {/* useSearchParams côté client : Suspense requis pour le rendu statique */}
            <Suspense>
                <DriveClient />
            </Suspense>
        </>
    );
}
