"use client";

import { useEffect, useState, useCallback } from "react";

interface HostStats {
  cpu: { percent: number };
  memory: { totalKb: number; usedKb: number; availableKb: number; percent: number };
  disk: { totalKb: number; usedKb: number; availableKb: number; percent: number };
}

interface ContainerStats {
  id: string;
  name: string;
  image: string;
  status: string;
  cpu: { percent: number };
  memory: { usedBytes: number; limitBytes: number; percent: number };
}

function fmtBytes(bytes: number): string {
  if (bytes >= 1073741824) return `${(bytes / 1073741824).toFixed(1)} Go`;
  if (bytes >= 1048576) return `${(bytes / 1048576).toFixed(0)} Mo`;
  return `${(bytes / 1024).toFixed(0)} Ko`;
}

function fmtKb(kb: number): string {
  return fmtBytes(kb * 1024);
}

function GaugeBar({ percent, label }: { percent: number; label: string }) {
  const color =
    percent >= 90
      ? "bg-down"
      : percent >= 70
        ? "bg-warn"
        : "bg-ok";

  return (
    <div className="mt-2">
      <div className="mb-1 flex justify-between font-mono text-[11px] text-text-muted">
        <span>{label}</span>
        <span className={percent >= 90 ? "text-down" : percent >= 70 ? "text-warn" : "text-ok"}>
          {percent.toFixed(1)}%
        </span>
      </div>
      <div className="h-1.5 w-full overflow-hidden rounded-full bg-hairline-strong">
        <div
          className={`h-full rounded-full transition-all duration-700 ${color}`}
          style={{ width: `${Math.min(percent, 100)}%` }}
        />
      </div>
    </div>
  );
}

function HostCard({ stats }: { stats: HostStats }) {
  return (
    <div className="grid gap-4 sm:grid-cols-3">
      {/* CPU */}
      <div className="glass-panel rounded-2xl p-4 sm:p-5">
        <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-text-muted">CPU</p>
        <p className="mt-2 font-serif text-2xl font-bold tracking-tight text-text-main">
          {stats.cpu.percent.toFixed(1)}%
        </p>
        <GaugeBar percent={stats.cpu.percent} label="utilisation" />
      </div>

      {/* RAM */}
      <div className="glass-panel rounded-2xl p-4 sm:p-5">
        <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-text-muted">RAM</p>
        <p className="mt-2 font-serif text-2xl font-bold tracking-tight text-text-main">
          {fmtKb(stats.memory.usedKb)}
        </p>
        <p className="font-mono text-[11px] text-text-muted">
          sur {fmtKb(stats.memory.totalKb)}
        </p>
        <GaugeBar percent={stats.memory.percent} label="utilisée" />
      </div>

      {/* Disque */}
      <div className="glass-panel rounded-2xl p-4 sm:p-5">
        <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-text-muted">Disque</p>
        <p className="mt-2 font-serif text-2xl font-bold tracking-tight text-text-main">
          {fmtKb(stats.disk.usedKb)}
        </p>
        <p className="font-mono text-[11px] text-text-muted">
          sur {fmtKb(stats.disk.totalKb)}
        </p>
        <GaugeBar percent={stats.disk.percent} label="utilisé" />
      </div>
    </div>
  );
}

function ContainerRow({ c }: { c: ContainerStats }) {
  const cpuColor =
    c.cpu.percent >= 80 ? "text-down" : c.cpu.percent >= 50 ? "text-warn" : "text-ok";
  const memColor =
    c.memory.percent >= 80 ? "text-down" : c.memory.percent >= 50 ? "text-warn" : "text-ok";

  return (
    <div className="glass-panel flex flex-wrap items-center gap-x-4 gap-y-2 rounded-xl px-4 py-3">
      {/* Nom */}
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-text-main">{c.name}</p>
        <p className="truncate font-mono text-[11px] text-text-muted">{c.image}</p>
      </div>

      {/* Statut */}
      <span className="rounded-full border border-hairline-strong px-2 py-0.5 font-mono text-[10px] text-text-muted">
        {c.status}
      </span>

      {/* CPU */}
      <div className="text-right">
        <p className="font-mono text-[11px] text-text-muted">CPU</p>
        <p className={`font-mono text-sm font-bold ${cpuColor}`}>
          {c.cpu.percent.toFixed(1)}%
        </p>
      </div>

      {/* RAM */}
      <div className="text-right">
        <p className="font-mono text-[11px] text-text-muted">RAM</p>
        <p className={`font-mono text-sm font-bold ${memColor}`}>
          {fmtBytes(c.memory.usedBytes)}
          {c.memory.limitBytes > 0 && (
            <span className="font-normal text-text-muted">
              {" "}/ {fmtBytes(c.memory.limitBytes)}
            </span>
          )}
        </p>
      </div>
    </div>
  );
}

function SkeletonCard() {
  return (
    <div className="glass-panel rounded-2xl p-4 sm:p-5">
      <div className="skeleton h-3 w-12 rounded-full" />
      <div className="skeleton mt-3 h-6 w-24 rounded-md" />
      <div className="skeleton mt-2 h-2 w-full rounded-full" />
    </div>
  );
}

export function SystemMonitor() {
  const [host, setHost] = useState<HostStats | null>(null);
  const [containers, setContainers] = useState<ContainerStats[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const fetch$ = useCallback(async () => {
    try {
      const [hostRes, containersRes] = await Promise.all([
        fetch("/api/deploy/system/host"),
        fetch("/api/deploy/system/containers"),
      ]);
      if (!hostRes.ok || !containersRes.ok) throw new Error("Réponse inattendue");
      const [hostData, containersData] = await Promise.all([
        hostRes.json(),
        containersRes.json(),
      ]);
      setHost(hostData);
      setContainers(containersData);
      setLastUpdated(new Date());
      setError(null);
    } catch {
      setError("Impossible de joindre deploy-agent");
    }
  }, []);

  useEffect(() => {
    fetch$();
    const id = setInterval(fetch$, 5000);
    return () => clearInterval(id);
  }, [fetch$]);

  return (
    <div className="space-y-10">
      {/* Host stats */}
      <div>
        <div className="mb-4 flex items-end justify-between">
          <div>
            <p className="eyebrow">Monitoring</p>
            <h2 className="mt-1 font-serif text-lg font-bold tracking-tight text-text-main sm:text-xl">
              Ressources VPS
            </h2>
          </div>
          {lastUpdated && (
            <p className="font-mono text-[11px] text-text-muted">
              mis à jour {lastUpdated.toLocaleTimeString("fr-FR")}
            </p>
          )}
        </div>
        <div
          aria-hidden="true"
          className="mb-5 h-px bg-gradient-to-r from-hairline-strong to-transparent"
        />

        {error ? (
          <p className="font-mono text-sm text-down">{error}</p>
        ) : host ? (
          <HostCard stats={host} />
        ) : (
          <div className="grid gap-4 sm:grid-cols-3">
            <SkeletonCard />
            <SkeletonCard />
            <SkeletonCard />
          </div>
        )}
      </div>

      {/* Containers */}
      <div>
        <div className="mb-4 flex items-end justify-between">
          <div>
            <p className="eyebrow">Docker</p>
            <h2 className="mt-1 font-serif text-lg font-bold tracking-tight text-text-main sm:text-xl">
              Conteneurs actifs
            </h2>
          </div>
          {containers && (
            <p className="font-mono text-[11px] text-text-muted">
              {containers.length} en cours
            </p>
          )}
        </div>
        <div
          aria-hidden="true"
          className="mb-5 h-px bg-gradient-to-r from-hairline-strong to-transparent"
        />

        {error ? null : containers === null ? (
          <div className="space-y-2">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="glass-panel h-14 rounded-xl" />
            ))}
          </div>
        ) : containers.length === 0 ? (
          <p className="font-mono text-sm text-text-muted">Aucun conteneur actif.</p>
        ) : (
          <div className="space-y-2">
            {containers.map((c) => (
              <ContainerRow key={c.id} c={c} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
