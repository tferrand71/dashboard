"use client";

import type { ReactNode } from "react";
import { ArrowUpRight, GitBranch, GitCommitHorizontal } from "lucide-react";
import type { AgentProject } from "@/lib/agent";
import { commitUrl, publicUrl, repoLabel } from "@/lib/agent";
import { timeAgo } from "@/lib/format";
import { ProjectStatusBadge, Skeleton } from "./ui";

/** Tableau des projets deploy-agent. `actions` ajoute une colonne (ex. bouton Déployer). */
export function ProjectsTable({
    projects,
    actions,
    showSource = true,
}: {
    projects: AgentProject[] | null;
    actions?: (project: AgentProject) => ReactNode;
    /** false dans les panneaux étroits (vue d'ensemble) */
    showSource?: boolean;
}) {
    const sourceClass = showSource ? "hidden xl:table-cell" : "hidden";
    if (!projects) {
        return (
            <div className="divide-y divide-line">
                {[0, 1, 2].map((i) => (
                    <div key={i} className="flex items-center gap-4 px-4 py-3.5">
                        <div className="flex-1 space-y-1.5">
                            <Skeleton className="h-3.5 w-32" />
                            <Skeleton className="h-3 w-48" />
                        </div>
                        <Skeleton className="h-5 w-20 rounded-full" />
                    </div>
                ))}
            </div>
        );
    }

    return (
        <div className="overflow-x-auto">
            <table className="w-full text-left text-[13px]">
                <thead className="hidden text-xs text-fg-subtle md:table-header-group">
                    <tr className="border-b border-line">
                        <th scope="col" className="px-4 py-2.5 font-medium">Projet</th>
                        <th scope="col" className="px-4 py-2.5 font-medium">Statut</th>
                        <th scope="col" className={`${sourceClass} px-4 py-2.5 font-medium`}>Source</th>
                        <th scope="col" className="px-4 py-2.5 text-right font-medium">Mis à jour</th>
                        {actions && <th scope="col" className="w-px px-4 py-2.5"><span className="sr-only">Actions</span></th>}
                    </tr>
                </thead>
                <tbody className="divide-y divide-line">
                    {projects.map((p) => {
                        const commit = p.lastCommit ? commitUrl(p.repoUrl, p.lastCommit) : null;
                        return (
                            <tr key={p.id} className="group transition-colors hover:bg-elevated/50">
                                <td className="px-4 py-3">
                                    <div className="flex items-center gap-3">
                                        <span
                                            aria-hidden="true"
                                            className="hidden h-8 w-8 shrink-0 items-center justify-center rounded-md border border-accent/25 bg-gradient-to-br from-accent/20 to-pink/10 text-xs font-semibold uppercase text-accent-fg sm:flex"
                                        >
                                            {p.name.slice(0, 2)}
                                        </span>
                                        <div className="min-w-0">
                                            <p className="truncate font-medium text-fg">{p.name}</p>
                                            <a
                                                href={publicUrl(p.subdomain)}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="inline-flex max-w-full items-center gap-0.5 truncate font-mono text-xs text-fg-muted hover:text-accent-fg"
                                            >
                                                {p.subdomain}
                                                <ArrowUpRight className="h-3 w-3 shrink-0 opacity-0 transition-opacity group-hover:opacity-100" />
                                            </a>
                                            {/* Statut sous le nom sur mobile, en colonne au-delà */}
                                            <div className="mt-1.5 md:hidden">
                                                <ProjectStatusBadge status={p.status} />
                                            </div>
                                        </div>
                                    </div>
                                </td>
                                <td className="hidden px-4 py-3 md:table-cell">
                                    <ProjectStatusBadge status={p.status} />
                                </td>
                                <td className={`${sourceClass} max-w-60 px-4 py-3`}>
                                    <p className="flex items-center gap-1.5 truncate text-xs text-fg-muted" title={`${repoLabel(p.repoUrl)} · ${p.branch}`}>
                                        <GitBranch className="h-3.5 w-3.5 shrink-0 text-fg-subtle" />
                                        <span className="truncate">{repoLabel(p.repoUrl)}</span>
                                        <span className="shrink-0 text-fg-subtle">· {p.branch}</span>
                                    </p>
                                    {p.lastCommit && (
                                        <p className="mt-1 flex items-center gap-1.5 font-mono text-xs text-fg-subtle">
                                            <GitCommitHorizontal className="h-3.5 w-3.5 shrink-0" />
                                            {commit ? (
                                                <a href={commit} target="_blank" rel="noopener noreferrer" className="hover:text-accent-fg">
                                                    {p.lastCommit.slice(0, 7)}
                                                </a>
                                            ) : (
                                                p.lastCommit.slice(0, 7)
                                            )}
                                        </p>
                                    )}
                                </td>
                                <td className="tabular whitespace-nowrap px-4 py-3 text-right text-xs text-fg-muted">
                                    <time dateTime={p.updatedAt} title={new Date(p.updatedAt).toLocaleString("fr-FR")}>
                                        {timeAgo(p.updatedAt)}
                                    </time>
                                </td>
                                {actions && <td className="px-4 py-3 text-right">{actions(p)}</td>}
                            </tr>
                        );
                    })}
                </tbody>
            </table>
        </div>
    );
}
