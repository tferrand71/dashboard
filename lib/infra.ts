import { prisma } from "@/lib/prisma";

export type DatabaseStatus =
    | { state: "up"; latencyMs: number; projectCount: number }
    | { state: "down"; message: string };

/**
 * Teste réellement la base : un aller-retour SQL, pas une supposition.
 * On mesure la latence au passage, c'est la seule métrique honnête
 * dont on dispose aujourd'hui.
 */
export async function getDatabaseStatus(): Promise<DatabaseStatus> {
    const startedAt = performance.now();

    try {
        const projectCount = await prisma.project.count();

        return {
            state: "up",
            latencyMs: Math.round(performance.now() - startedAt),
            projectCount,
        };
    } catch (error) {
        return {
            state: "down",
            message:
                error instanceof Error
                    ? error.message
                    : "Erreur inconnue à la connexion",
        };
    }
}

export type ProjectRow = {
    id: string;
    name: string;
    subdomain: string;
    createdAt: Date;
};

export async function getProjects(): Promise<ProjectRow[]> {
    return prisma.project.findMany({
        orderBy: { createdAt: "desc" },
        select: { id: true, name: true, subdomain: true, createdAt: true },
    });
}

export type ProcessInfo = {
    uptimeSeconds: number;
    nodeVersion: string;
    environment: string;
};

/**
 * Faits sur le processus qui sert ce dashboard — à ne pas confondre
 * avec l'uptime du VPS lui-même, que l'on ne mesure pas encore.
 */
export function getProcessInfo(): ProcessInfo {
    return {
        uptimeSeconds: Math.floor(process.uptime()),
        nodeVersion: process.version,
        environment: process.env.NODE_ENV ?? "unknown",
    };
}
