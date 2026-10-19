import { Database, ShieldCheck, Timer } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { getDatabaseStatus, getProcessInfo } from "@/lib/infra";
import { formatDuration } from "@/lib/format";
import { Badge, Panel, Skeleton, type Tone } from "./ui";

function Row({
    icon: Icon,
    label,
    detail,
    tone,
    status,
}: {
    icon: LucideIcon;
    label: string;
    detail: string;
    tone: Tone;
    status: string;
}) {
    return (
        <li className="flex items-center gap-3 px-4 py-3">
            <Icon className="h-4 w-4 shrink-0 text-fg-subtle" strokeWidth={1.75} />
            <div className="min-w-0 flex-1">
                <p className="text-[13px] font-medium text-fg">{label}</p>
                <p className="truncate text-xs text-fg-subtle" title={detail}>
                    {detail}
                </p>
            </div>
            <Badge tone={tone} dot>
                {status}
            </Badge>
        </li>
    );
}

/**
 * Trois faits vérifiés au rendu : la session, un vrai aller-retour vers
 * PostgreSQL, et le processus qui sert cette page.
 */
export async function ServiceHealth({ email }: { email: string }) {
    const database = await getDatabaseStatus();
    const runtime = getProcessInfo();

    return (
        <Panel title="Console" description="Vérifié au chargement de la page">
            <ul className="divide-y divide-line">
                <Row icon={ShieldCheck} label="Session" detail={email} tone="ok" status="Authentifié" />
                {database.state === "up" ? (
                    <Row
                        icon={Database}
                        label="PostgreSQL"
                        detail={`${database.latencyMs} ms aller-retour`}
                        tone="ok"
                        status="Connectée"
                    />
                ) : (
                    <Row icon={Database} label="PostgreSQL" detail={database.message} tone="down" status="Injoignable" />
                )}
                <Row
                    icon={Timer}
                    label="Processus"
                    detail={`node ${runtime.nodeVersion} · ${runtime.environment}`}
                    tone="neutral"
                    status={formatDuration(runtime.uptimeSeconds)}
                />
            </ul>
        </Panel>
    );
}

export function ServiceHealthSkeleton() {
    return (
        <Panel title="Console">
            <div className="divide-y divide-line">
                {[0, 1, 2].map((i) => (
                    <div key={i} className="flex items-center gap-3 px-4 py-3">
                        <Skeleton className="h-4 w-4" />
                        <div className="flex-1 space-y-1.5">
                            <Skeleton className="h-3 w-20" />
                            <Skeleton className="h-2.5 w-32" />
                        </div>
                        <Skeleton className="h-5 w-16 rounded-full" />
                    </div>
                ))}
            </div>
        </Panel>
    );
}
