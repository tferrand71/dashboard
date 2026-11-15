import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { PageHeader } from "../../_components/ui";
import { UsersClient } from "./_components/users-client";

export const metadata: Metadata = { title: "Utilisateurs Plex" };

export default async function PlexUsersPage() {
    const session = await auth();
    if (!session) redirect("/login");

    return (
        <>
            <PageHeader
                eyebrow="Services"
                title="Utilisateurs Plex"
                description="Qui peut regarder quoi sur ton serveur : invite des amis, crée des profils du Plex Home et choisis leurs bibliothèques."
            />
            <UsersClient />
        </>
    );
}
