import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { PageHeader } from "../../_components/ui";
import { FilesClient } from "./_components/files-client";

export const metadata: Metadata = { title: "Fichiers Plex" };

export default async function PlexFilesPage() {
    const session = await auth();
    if (!session) redirect("/login");

    return (
        <>
            <PageHeader
                eyebrow="Services"
                title="Fichiers Plex"
                description="Glisse tes films ici : ils transitent par le VPS (sans y être stockés) puis arrivent sur le serveur Plex, via Tailscale."
            />
            <FilesClient />
        </>
    );
}
