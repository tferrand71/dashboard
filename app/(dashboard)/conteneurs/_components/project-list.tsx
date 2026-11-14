"use client";

import { Boxes } from "lucide-react";
import type { AgentProject } from "@/lib/agent";
import type { CronState } from "@/lib/cron";
import { ProjectsTable } from "../../_components/projects-table";
import { EmptyState, ErrorBanner, LiveIndicator, Panel, PROJECT_STATUS } from "../../_components/ui";
import { usePoll } from "../../_components/use-poll";
import { DeleteProjectButton } from "./delete-project-button";
import { DeployButton } from "./deploy-button";
import { ProjectForm } from "./project-form";
import { ScheduleButton } from "./schedule-button";
import { ScheduledDeploys } from "./scheduled-deploys";

export function ProjectList() {
    // 5 s : le statut passe de « Build en cours » à « En ligne » sans recharger.
    const { data, error, updatedAt, refresh } = usePoll<AgentProject[]>("/api/deploy/projects", 5000);
    // Déploiements programmés (deploy-cron) : 10 s suffisent, l'échéance se compte en heures.
    const cron = usePoll<CronState>("/api/cron/schedules", 10_000, undefined, "deploy-cron injoignable");

    const counts = Object.entries(PROJECT_STATUS)
        .map(([status, { label }]) => ({ label, n: data?.filter((p) => p.status === status).length ?? 0 }))
        .filter((c) => c.n > 0);

    return (
        <div className="mt-8 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
                <p className="text-[13px] text-fg-muted">
                    {data
                        ? counts.map((c) => `${c.n} ${c.label.toLowerCase()}`).join(" · ") || "Aucun projet"
                        : "Chargement…"}
                </p>
                <div className="flex items-center gap-4">
                    <LiveIndicator updatedAt={updatedAt} error={error} />
                    <ProjectForm onCreated={refresh} />
                </div>
            </div>

            <Panel title="Projets déployés" description="Clonés, construits et publiés derrière Traefik avec un certificat HTTPS">
                {error && !data ? (
                    <div className="p-4">
                        <ErrorBanner>Impossible de joindre deploy-agent.</ErrorBanner>
                    </div>
                ) : data?.length === 0 ? (
                    <EmptyState icon={Boxes} title="Aucun projet déployé">
                        Crée un projet à partir d&apos;un dépôt Git pour le publier sur un sous-domaine.
                    </EmptyState>
                ) : (
                    <ProjectsTable
                        projects={data}
                        actions={(p) => (
                            <div className="flex items-start justify-end gap-1">
                                <DeployButton projectId={p.id} building={p.status === "BUILDING"} onDeployed={refresh} />
                                <ScheduleButton project={p} onScheduled={cron.refresh} />
                                <DeleteProjectButton project={p} onDeleted={refresh} />
                            </div>
                        )}
                    />
                )}
            </Panel>

            <ScheduledDeploys state={cron.data} error={cron.error} onChanged={cron.refresh} />
        </div>
    );
}
