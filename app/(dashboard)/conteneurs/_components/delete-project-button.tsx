"use client";

import { useState } from "react";
import { Loader2, Trash2 } from "lucide-react";
import type { AgentProject } from "@/lib/agent";
import { Dialog } from "../../_components/dialog";
import { ErrorBanner } from "../../_components/ui";

/**
 * Suppression d'un projet deploy-agent. Il faut retaper le nom du projet :
 * un site en ligne disparaît immédiatement, on évite le clic malheureux.
 */
export function DeleteProjectButton({
    project,
    onDeleted,
}: {
    project: AgentProject;
    onDeleted: () => void;
}) {
    const [open, setOpen] = useState(false);
    const [confirm, setConfirm] = useState("");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const building = project.status === "BUILDING";
    const online = project.status === "RUNNING";

    function close() {
        setOpen(false);
        setConfirm("");
        setError(null);
    }

    async function remove() {
        setLoading(true);
        setError(null);
        const res = await fetch(`/api/deploy/projects/${project.id}`, { method: "DELETE" });
        setLoading(false);

        if (!res.ok) {
            const data = await res.json().catch(() => ({}));
            setError(data.error ?? "Suppression impossible");
            return;
        }
        close();
        onDeleted();
    }

    return (
        <>
            <button
                type="button"
                onClick={() => setOpen(true)}
                disabled={building}
                title={building ? "Build en cours" : "Supprimer le projet"}
                className="btn btn-ghost h-7 w-7 px-0 hover:bg-down/10 hover:text-down"
            >
                <Trash2 className="h-3.5 w-3.5" />
                <span className="sr-only">Supprimer {project.name}</span>
            </button>

            {open && (
                <Dialog
                    title={`Supprimer ${project.name} ?`}
                    description={
                        online ? (
                            <>
                                Le site <span className="font-mono text-fg">{project.subdomain}</span> sera
                                immédiatement mis hors ligne.
                            </>
                        ) : (
                            "Le projet sera retiré de deploy-agent."
                        )
                    }
                    onClose={close}
                    size="md"
                    footer={
                        <>
                            <button type="button" onClick={close} className="btn btn-secondary">
                                Annuler
                            </button>
                            <button
                                type="submit"
                                form="delete-project"
                                disabled={confirm !== project.name || loading}
                                className="btn btn-danger"
                            >
                                {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
                                Supprimer définitivement
                            </button>
                        </>
                    }
                >
                    <form
                        id="delete-project"
                        onSubmit={(e) => {
                            e.preventDefault();
                            if (confirm === project.name) remove();
                        }}
                        className="space-y-4"
                    >
                        {error && <ErrorBanner>{error}</ErrorBanner>}

                        <div className="grid gap-3 text-[13px] sm:grid-cols-2">
                            <div className="rounded-md border border-down/20 bg-down/5 p-3">
                                <p className="font-medium text-down">Supprimé</p>
                                <ul className="mt-1.5 space-y-0.5 text-fg-muted">
                                    <li>Conteneur et image Docker</li>
                                    <li>Copie locale du dépôt</li>
                                    <li>Secrets du projet</li>
                                </ul>
                            </div>
                            <div className="rounded-md border border-line bg-elevated/60 p-3">
                                <p className="font-medium text-fg">Conservé</p>
                                <ul className="mt-1.5 space-y-0.5 text-fg-muted">
                                    <li>Base PostgreSQL</li>
                                    <li>Volumes de fichiers</li>
                                    <li>Dépôt GitHub</li>
                                </ul>
                            </div>
                        </div>

                        <label className="block">
                            <span className="label">
                                Tape <span className="font-mono text-fg">{project.name}</span> pour confirmer
                            </span>
                            <input
                                autoFocus
                                value={confirm}
                                onChange={(e) => setConfirm(e.target.value)}
                                autoComplete="off"
                                spellCheck={false}
                                className="input font-mono"
                            />
                        </label>
                    </form>
                </Dialog>
            )}
        </>
    );
}
