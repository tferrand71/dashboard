import { getProjects } from "@/lib/infra";
import { formatDate } from "@/lib/format";
import { GlobeIcon } from "./icons";

/** Lit la table `Project`. S'il n'y a rien, on le dit — on n'invente pas de ligne. */
export async function ProjectsPanel() {
    let projects;

    try {
        projects = await getProjects();
    } catch {
        return (
            <p
                role="alert"
                className="rounded-2xl border border-down/30 bg-down/5 px-4 py-3 text-sm text-text-main"
            >
                Impossible de lire la table des projets. Vérifie la connexion à
                PostgreSQL.
            </p>
        );
    }

    if (projects.length === 0) {
        return (
            <div className="glass-panel rounded-2xl px-4 py-8 text-center sm:py-10">
                <GlobeIcon className="mx-auto h-6 w-6 text-text-muted/50" />
                <p className="mt-3 text-sm font-medium text-text-main">
                    Aucun projet enregistré
                </p>
                <p className="mx-auto mt-1 max-w-sm text-xs leading-relaxed text-text-muted">
                    La table <code className="font-mono text-mauve-text">Project</code>{" "}
                    est vide. Les sous-domaines servis par Traefik apparaîtront ici
                    dès qu&apos;ils y seront déclarés.
                </p>
            </div>
        );
    }

    return (
        <ul className="glass-panel divide-y divide-hairline overflow-hidden rounded-2xl">
            {projects.map((project) => (
                <li
                    key={project.id}
                    className="flex items-center gap-3 px-4 py-3 transition-colors hover:bg-glass/60"
                >
                    <GlobeIcon className="h-4 w-4 shrink-0 text-text-muted" />
                    <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium text-text-main">
                            {project.name}
                        </p>
                        <p className="truncate font-mono text-[11px] text-mauve-text">
                            {project.subdomain}
                        </p>
                    </div>
                    <time
                        dateTime={project.createdAt.toISOString()}
                        className="shrink-0 font-mono text-[10px] text-text-muted"
                    >
                        {formatDate(project.createdAt)}
                    </time>
                </li>
            ))}
        </ul>
    );
}

export function ProjectsPanelSkeleton() {
    return (
        <div className="glass-panel divide-y divide-hairline overflow-hidden rounded-2xl">
            {[0, 1, 2].map((row) => (
                <div key={row} className="flex items-center gap-3 px-4 py-3">
                    <div className="skeleton h-4 w-4 rounded-full" />
                    <div className="flex-1 space-y-1.5">
                        <div className="skeleton h-3.5 w-32 rounded-full" />
                        <div className="skeleton h-2.5 w-44 rounded-full" />
                    </div>
                    <div className="skeleton h-2.5 w-16 rounded-full" />
                </div>
            ))}
        </div>
    );
}
