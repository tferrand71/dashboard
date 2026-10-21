/** Formes renvoyées par deploy-agent, lues côté client via /api/deploy/*. */

export type ProjectStatus = "IDLE" | "BUILDING" | "RUNNING" | "FAILED";

export type AgentProject = {
    id: string;
    name: string;
    repoUrl: string;
    branch: string;
    subdomain: string;
    lastCommit: string | null;
    status: ProjectStatus | string;
    createdAt: string;
    updatedAt: string;
};

export type HostStats = {
    cpu: { percent: number };
    memory: { totalKb: number; usedKb: number; availableKb: number; percent: number };
    disk: { totalKb: number; usedKb: number; availableKb: number; percent: number };
};

export type ContainerStats = {
    id: string;
    name: string;
    image: string;
    status: string;
    cpu: { percent: number };
    memory: { usedBytes: number; limitBytes: number; percent: number };
};

/** Stockage d'un conteneur (route /system/storage) : couche inscriptible, part de l'image, volumes nommés. */
export type ContainerStorage = {
    id: string;
    name: string;
    writableBytes: number;
    imageBytes: number;
    volumes: { name: string; sizeBytes: number | null }[];
    totalBytes: number;
};

/**
 * Conteneur éphémère : étape de build Docker ou commande ponctuelle.
 * Docker leur donne un nom « adjectif_scientifique » (sleepy_johnson…)
 * et l'image d'une couche intermédiaire (sha256:…). Ils disparaissent seuls.
 */
export function isEphemeral(c: ContainerStats): boolean {
    return /^[a-z]+_[a-z]+$/.test(c.name) || c.image.startsWith("sha256:");
}

/** `project-<id>` → nom lisible du projet deploy-agent, sinon le nom Docker. */
export function containerLabel(c: ContainerStats, projects: AgentProject[]): string {
    const match = c.name.match(/^project-(.+)$/);
    if (match) {
        const project = projects.find((p) => p.id === match[1]);
        if (project) return project.name;
    }
    return c.name;
}

export function publicUrl(subdomain: string): string {
    return `https://${subdomain}`;
}

/** Lien vers le commit quand le dépôt est sur GitHub. */
export function commitUrl(repoUrl: string, sha: string): string | null {
    const m = repoUrl.match(/github\.com[/:]([^/]+\/[^/.]+)/);
    return m ? `https://github.com/${m[1]}/commit/${sha}` : null;
}

export function repoLabel(repoUrl: string): string {
    return repoUrl.replace(/^https?:\/\/(www\.)?github\.com\//, "").replace(/\.git$/, "");
}

export function level(percent: number): "ok" | "warn" | "down" {
    if (percent >= 90) return "down";
    if (percent >= 75) return "warn";
    return "ok";
}
