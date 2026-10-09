"use client";

import { useState } from "react";

type Props = {
  onCreated: () => void;
};

export function ProjectForm({ onCreated }: Props) {
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

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="rounded-xl border border-mauve/30 bg-mauve/10 px-4 py-2 font-mono text-xs font-bold uppercase tracking-[0.15em] text-mauve-text transition-colors hover:border-mauve/60 hover:bg-mauve/20"
      >
        + Nouveau projet
      </button>
    );
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="glass-panel rounded-2xl p-6 space-y-4"
    >
      <h3 className="font-serif text-base font-bold text-text-main">
        Nouveau projet
      </h3>

      {error && (
        <p className="rounded-lg bg-down/10 border border-down/30 px-3 py-2 text-xs text-down">
          {error}
        </p>
      )}

      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Nom" name="name" placeholder="mon-app" required />
        <Field
          label="Sous-domaine"
          name="subdomain"
          placeholder="mon-app.tobias-ferrand.fr"
          required
        />
        <Field
          label="URL du dépôt"
          name="repoUrl"
          placeholder="https://github.com/..."
          required
          className="sm:col-span-2"
        />
        <Field label="Branche" name="branch" placeholder="main" />
      </div>

      <div className="flex gap-3 pt-1">
        <button
          type="submit"
          disabled={loading}
          className="rounded-xl bg-mauve/20 border border-mauve/40 px-4 py-2 font-mono text-xs font-bold uppercase tracking-[0.15em] text-mauve-text transition-colors hover:bg-mauve/30 disabled:opacity-50"
        >
          {loading ? "Création…" : "Créer"}
        </button>
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="rounded-xl border border-hairline px-4 py-2 font-mono text-xs text-text-muted transition-colors hover:border-hairline-strong"
        >
          Annuler
        </button>
      </div>
    </form>
  );
}

function Field({
  label,
  name,
  placeholder,
  required,
  className,
}: {
  label: string;
  name: string;
  placeholder?: string;
  required?: boolean;
  className?: string;
}) {
  return (
    <label className={`flex flex-col gap-1.5 ${className ?? ""}`}>
      <span className="font-mono text-[10px] font-bold uppercase tracking-[0.2em] text-text-muted">
        {label}
      </span>
      <input
        name={name}
        placeholder={placeholder}
        required={required}
        className="rounded-lg border border-hairline bg-ink/40 px-3 py-2 text-sm text-text-main placeholder:text-text-muted/50 focus:border-mauve/50 focus:outline-none"
      />
    </label>
  );
}
