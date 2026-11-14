import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { PageHeader } from "../_components/ui";
import { PlexPanel } from "./_components/plex-panel";

export const metadata: Metadata = { title: "Plex" };

export default async function PlexPage() {
    const session = await auth();
    if (!session) redirect("/login");

    return (
        <>
            <PageHeader
                eyebrow="Services"
                title="Plex"
                description="Bibliothèque, avancement de lecture et activité du serveur à la maison, joint via Tailscale."
            />
            <PlexPanel />
        </>
    );
}
