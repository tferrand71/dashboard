"use client";

import { useState } from "react";
import { Loader2, Rocket } from "lucide-react";

export function DeployButton({
    projectId,
    building,
    onDeployed,
}: {
    projectId: string;
    building: boolean;
    onDeployed: () => void;
}) {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    async function deploy() {
        setLoading(true);
        setError(null);

        const res = await fetch(`/api/deploy/projects/${projectId}/deploy`, { method: "POST" });

        setLoading(false);

        if (!res.ok) {
            const data = await res.json().catch(() => ({}));
            setError(data.error ?? "Erreur de déploiement");
            return;
        }

        onDeployed();
    }

    const busy = loading || building;

    return (
        <div className="flex flex-col items-end gap-1">
            <button type="button" onClick={deploy} disabled={busy} className="btn btn-secondary h-7 px-2.5 text-xs">
                {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Rocket className="h-3.5 w-3.5" />}
                {building ? "En cours" : loading ? "Lancement…" : "Déployer"}
            </button>
            {error && <p className="max-w-40 text-right text-[11px] text-down">{error}</p>}
        </div>
    );
}
