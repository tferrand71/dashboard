"use client";

import { useCallback, useEffect, useState } from "react";
import { DeployButton, StatusBadge } from "./deploy-button";
import { ProjectForm } from "./project-form";

type Project = {
  id: string;
  name: string;
  subdomain: string;
  branch: string;
  lastCommit: string | null;
  status: string;
  updatedAt: string;
};

export function ProjectList() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/deploy/projects");
      if (!res.ok) throw new Error("Impossible de contacter deploy-agent");
      setProjects(await res.json());
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur inconnue");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return (
    <div className="space-y-5">
      <div className="flex justify-end">
        <ProjectForm onCreated={refresh} />
      </div>

      {loading && (
        <div className="space-y-3">
          {[0, 1].map((i) => (
            <div
              key={i}
              className="glass-panel h-16 animate-pulse rounded-2xl"
            />
          ))}
        </div>
      )}

      {error && (
        <p className="rounded-xl border border-down/30 bg-down/10 px-4 py-3 text-sm text-down">
          {error}
        </p>
      )}

      {!loading && !error && projects.length === 0 && (
        <p className="text-sm text-text-muted">
          Aucun projet déployé pour l&apos;instant.
        </p>
      )}

      {!loading && !error && projects.length > 0 && (
        <ul className="space-y-3">
          {projects.map((project) => (
            <li
              key={project.id}
              className="glass-panel flex flex-wrap items-center justify-between gap-4 rounded-2xl px-5 py-4"
            >
              <div className="min-w-0">
                <div className="flex items-center gap-3">
                  <span className="font-serif text-sm font-bold text-text-main">
                    {project.name}
                  </span>
                  <StatusBadge status={project.status} />
                </div>
                <p className="mt-0.5 truncate font-mono text-[10px] text-text-muted">
                  {project.subdomain}
                  {project.lastCommit && (
                    <> · {project.lastCommit.slice(0, 7)}</>
                  )}
                </p>
              </div>

              <DeployButton projectId={project.id} onDeployed={refresh} />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
