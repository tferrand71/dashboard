import type { Metadata } from "next";
import Link from "next/link";
import { FolderUp, Users } from "lucide-react";
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
                description="Bibliothèque, lectures en cours et alimentation du serveur à la maison, joint via Tailscale."
                actions={
                    <>
                        <Link href="/plex/utilisateurs" className="btn btn-secondary">
                            <Users className="h-3.5 w-3.5" />
                            Utilisateurs
                        </Link>
                        <Link href="/plex/fichiers" className="btn btn-primary">
                            <FolderUp className="h-3.5 w-3.5" />
                            Gérer les fichiers
                        </Link>
                    </>
                }
            />
            <PlexPanel />
        </>
    );
}
