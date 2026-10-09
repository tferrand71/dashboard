import { getDatabaseStatus, getProcessInfo } from "@/lib/infra";
import { formatDuration } from "@/lib/format";
import { DatabaseIcon, PulseIcon, ShieldIcon } from "./icons";
import { StatusTile, StatusTileSkeleton } from "./status-tile";

/**
 * Trois faits vérifiables, rien de plus : la session en cours, un vrai
 * aller-retour vers PostgreSQL, et l'état du processus qui rend cette page.
 */
export async function ServiceHealth({ email }: { email: string }) {
    const database = await getDatabaseStatus();
    const runtime = getProcessInfo();

    return (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <StatusTile
                label="Session"
                state="ok"
                value="Authentifié"
                icon={ShieldIcon}
                detail={<span className="break-all">{email}</span>}
            />

            {database.state === "up" ? (
                <StatusTile
                    label="PostgreSQL"
                    state="ok"
                    value="Connectée"
                    icon={DatabaseIcon}
                    detail={`${database.latencyMs} ms · ${database.projectCount} projet${
                        database.projectCount === 1 ? "" : "s"
                    }`}
                />
            ) : (
                <StatusTile
                    label="PostgreSQL"
                    state="down"
                    value="Injoignable"
                    icon={DatabaseIcon}
                    detail={<span className="break-words">{database.message}</span>}
                />
            )}

            <StatusTile
                label="Processus dashboard"
                state="neutral"
                value={`Actif ${formatDuration(runtime.uptimeSeconds)}`}
                icon={PulseIcon}
                detail={`node ${runtime.nodeVersion} · ${runtime.environment}`}
            />
        </div>
    );
}

export function ServiceHealthSkeleton() {
    return (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <StatusTileSkeleton />
            <StatusTileSkeleton />
            <StatusTileSkeleton />
        </div>
    );
}
