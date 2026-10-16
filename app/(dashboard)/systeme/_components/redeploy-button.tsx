"use client";

import { useEffect, useRef, useState } from "react";

type RedeployState = {
  status: "running" | "success" | "error";
  message?: string;
};

const POLL_MS = 3000;
const MAX_POLLS = 200; // ~10 min, au-delà on arrête de suivre

/**
 * Redéploie un conteneur lancé avec docker compose : git pull puis
 * docker compose up -d --build, côté deploy-agent. Le bouton suit le statut
 * jusqu'à la fin et affiche le message renvoyé par l'agent.
 */
export function RedeployButton({ containerId }: { containerId: string }) {
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<RedeployState | null>(null);
  const [error, setError] = useState<string | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const base = `/api/deploy/system/containers/${containerId}/redeploy`;

  function stopPolling() {
    if (pollRef.current) clearInterval(pollRef.current);
    pollRef.current = null;
  }

  useEffect(() => stopPolling, []);

  async function poll() {
    let polls = 0;
    pollRef.current = setInterval(async () => {
      polls += 1;
      try {
        const res = await fetch(base);
        if (!res.ok) return;
        const state: RedeployState = await res.json();
        if (state.status !== "running" || polls >= MAX_POLLS) {
          stopPolling();
          setBusy(false);
          setResult(state);
        }
      } catch {
        // Réseau instable : on réessaie au tick suivant
      }
    }, POLL_MS);
  }

  async function redeploy() {
    setBusy(true);
    setError(null);
    setResult(null);

    try {
      const res = await fetch(base, { method: "POST" });
      if (res.status !== 202) {
        const data = await res.json().catch(() => ({}));
        setError(data.error ?? "Redéploiement refusé");
        setBusy(false);
        return;
      }
      poll();
    } catch {
      setError("Agent injoignable");
      setBusy(false);
    }
  }

  const resultLabel =
    result?.status === "success"
      ? "Redéployé"
      : result?.status === "error"
        ? "Échec"
        : null;

  return (
    <div className="flex flex-col items-end gap-1">
      <button
        onClick={redeploy}
        disabled={busy}
        className="rounded-lg border border-gold/30 bg-gold/10 px-2.5 py-1 font-mono text-[10px] font-bold uppercase tracking-[0.15em] text-gold transition-colors hover:border-gold/60 hover:bg-gold/20 disabled:opacity-50"
      >
        {busy ? "En cours…" : "Redéployer"}
      </button>
      {resultLabel && (
        <p className={`font-mono text-[10px] ${result?.status === "error" ? "text-down" : "text-ok"}`}>
          {resultLabel}
        </p>
      )}
      {error && <p className="max-w-[16rem] text-right text-[10px] text-down">{error}</p>}
      {result?.status === "error" && result.message && (
        <pre className="max-h-40 max-w-[28rem] overflow-auto whitespace-pre-wrap text-[10px] text-down">
          {result.message}
        </pre>
      )}
    </div>
  );
}
