import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { PageHeader } from "../_components/ui";
import { ProjectList } from "./_components/project-list";

export const metadata: Metadata = { title: "Projets" };

export default async function ConteneursPage() {
    const session = await auth();
    if (!session) redirect("/login");

    return (
        <>
            <PageHeader
                eyebrow="Infrastructure"
                title="Projets"
                description="Déploie un site depuis son dépôt Git : build, lancement du conteneur et certificat HTTPS automatiques."
            />
            <ProjectList />
        </>
    );
}
