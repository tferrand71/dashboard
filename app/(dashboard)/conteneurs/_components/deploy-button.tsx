"use client";

import { useState } from "react";

type Props = {
  projectId: string;
  onDeployed: () => void;
};

const STATUS_LABEL: Record<string, string> = {
  IDLE: "En attente",
  BUILDING: "Build en cours…",
  RUNNING: "En ligne",
  FAILED: "Échec",
};

const STATUS_COLOR: Record<string, string> = {
  IDLE: "text-text-muted",
  BUILDING: "text-warn",
  RUNNING: "text-ok",
  FAILED: "text-down",
};

export function StatusBadge({ status }: { status: string }) {
  return (
    <span
      className={`font-mono text-[10px] font-bold uppercase tracking-[0.15em] ${STATUS_COLOR[status] ?? "text-text-muted"}`}
    >
      {STATUS_LABEL[status] ?? status}
    </span>
  );
}

export function DeployButton({ projectId, onDeployed }: Props) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function deploy() {
    setLoading(true);
    setError(null);

    const res = await fetch(`/api/deploy/projects/${projectId}/deploy`, {
      method: "POST",
    });

    setLoading(false);

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error ?? "Erreur de déploiement");
      return;
    }

    onDeployed();
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <button
        onClick={deploy}
        disabled={loading}
        className="rounded-lg border border-gold/30 bg-gold/10 px-3 py-1.5 font-mono text-[10px] font-bold uppercase tracking-[0.15em] text-gold transition-colors hover:border-gold/60 hover:bg-gold/20 disabled:opacity-50"
      >
        {loading ? "Lancement…" : "Déployer"}
      </button>
      {error && <p className="text-[10px] text-down">{error}</p>}
    </div>
  );
}
