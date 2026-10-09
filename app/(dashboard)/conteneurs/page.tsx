import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { Section } from "../_components/section";
import { ProjectList } from "./_components/project-list";

export const metadata: Metadata = { title: "Conteneurs" };

export default async function ConteneursPage() {
  const session = await auth();
  if (!session) redirect("/login");

  return (
    <div className="mx-auto max-w-5xl">
      <header className="animate-rise">
        <p className="eyebrow">Infrastructure</p>
        <h1 className="mt-2 font-serif text-3xl font-bold leading-[1.1] tracking-tight text-text-main sm:text-4xl">
          Conteneurs
        </h1>
        <p className="mt-3 max-w-md text-sm font-light leading-relaxed text-text-muted">
          Déployez un nouveau projet depuis un dépôt Git — build, lancement et
          certificat Traefik automatiques.
        </p>
      </header>

      <Section eyebrow="deploy-agent" title="Projets déployés">
        <ProjectList />
      </Section>
    </div>
  );
}
