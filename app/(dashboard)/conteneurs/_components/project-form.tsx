"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import { Dialog } from "../../_components/dialog";
import { ErrorBanner } from "../../_components/ui";

export function ProjectForm({ onCreated }: { onCreated: () => void }) {
    const [open, setOpen] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
        e.preventDefault();
        setLoading(true);
        setError(null);

        const fd = new FormData(e.currentTarget);
        const body = {
            name: fd.get("name"),
            repoUrl: fd.get("repoUrl"),
            branch: fd.get("branch") || "main",
            subdomain: fd.get("subdomain"),
        };

        const res = await fetch("/api/deploy/projects", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(body),
        });

        setLoading(false);

        if (!res.ok) {
            const data = await res.json().catch(() => ({}));
            setError(data.error ?? "Erreur lors de la création");
            return;
        }

        setOpen(false);
        onCreated();
    }

    return (
        <>
            <button type="button" onClick={() => setOpen(true)} className="btn btn-primary">
                <Plus className="h-4 w-4" />
                Nouveau projet
            </button>

            {open && (
                <Dialog
                    title="Nouveau projet"
                    description="Le dépôt sera cloné puis construit avec son compose.yml ou son Dockerfile."
                    onClose={() => setOpen(false)}
                    size="md"
                    footer={
                        <>
                            <button type="button" onClick={() => setOpen(false)} className="btn btn-secondary">
                                Annuler
                            </button>
                            <button type="submit" form="project-form" disabled={loading} className="btn btn-primary">
                                {loading ? "Création…" : "Créer le projet"}
                            </button>
                        </>
                    }
                >
                    <form id="project-form" onSubmit={handleSubmit} className="space-y-4">
                        {error && <ErrorBanner>{error}</ErrorBanner>}
                        <div className="grid gap-4 sm:grid-cols-2">
                            <Field label="Nom" name="name" placeholder="mon-app" required autoFocus />
                            <Field label="Branche" name="branch" placeholder="main" />
                            <Field
                                label="Domaine"
                                name="subdomain"
                                placeholder="mon-app.tobias-ferrand.fr"
                                required
                                className="sm:col-span-2"
                                mono
                            />
                            <Field
                                label="URL du dépôt"
                                name="repoUrl"
                                placeholder="https://github.com/…"
                                required
                                className="sm:col-span-2"
                                mono
                            />
                        </div>
                    </form>
                </Dialog>
            )}
        </>
    );
}

function Field({
    label,
    name,
    placeholder,
    required,
    className = "",
    mono = false,
    autoFocus = false,
}: {
    label: string;
    name: string;
    placeholder?: string;
    required?: boolean;
    className?: string;
    mono?: boolean;
    autoFocus?: boolean;
}) {
    return (
        <label className={className}>
            <span className="label">{label}</span>
            <input
                name={name}
                placeholder={placeholder}
                required={required}
                autoFocus={autoFocus}
                className={`input ${mono ? "font-mono text-[13px]" : ""}`}
            />
        </label>
    );
}
