import { ProjectsPanelSkeleton } from "./_components/projects-panel";
import { Section } from "./_components/section";
import { ServiceHealthSkeleton } from "./_components/service-health";

export default function Loading() {
    return (
        <div className="mx-auto max-w-5xl" aria-busy="true" aria-live="polite">
            <span className="sr-only">Chargement du tableau de bord…</span>

            <div className="space-y-3">
                <div className="skeleton h-2.5 w-28 rounded-full" />
                <div className="skeleton h-9 w-64 rounded-lg" />
                <div className="skeleton h-3 w-80 max-w-full rounded-full" />
            </div>

            <Section eyebrow="Vérification" title="État du service">
                <ServiceHealthSkeleton />
            </Section>

            <Section eyebrow="Base de données" title="Projets enregistrés">
                <ProjectsPanelSkeleton />
            </Section>
        </div>
    );
}
