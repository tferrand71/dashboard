/**
 * Mises à jour du serveur Plex (apt) depuis le dashboard, via la passerelle SSH.
 *
 * Seul le script root `plex-apt-update` peut lancer apt (règle sudoers étroite côté serveur).
 * La mise à jour tourne détachée sur le serveur : elle survit à une coupure de connexion
 * ou à un redémarrage du dashboard, et on en suit l'avancement en relisant son état.
 */
import { gate } from "@/lib/media";
import { probePlayback } from "@/lib/plug";
import type { PlugBlocker } from "@/lib/plug";

export type AptPackage = { name: string; from: string | null; to: string };

export type AptState =
    | { state: "idle" }
    | { state: "running"; pid: number; started: number }
    | { state: "finished"; exit: number; started: number; ended: number }
    | { state: "interrupted"; started?: number };

export type AptSnapshot = {
    /** Ce que `apt-get upgrade` installera réellement. */
    upgradable: AptPackage[];
    /** Proposés par apt mais différés (déploiement progressif d'Ubuntu, paquets retenus) : `upgrade` ne les installe pas. */
    deferred: AptPackage[];
    state: AptState;
    /** Dernières lignes du journal de la mise à jour. */
    log: string;
    reboot_required: boolean;
    /** Dernière actualisation de la liste des paquets (epoch, secondes). */
    checked: number | null;
    now: number;
};

export function aptStatus() {
    return gate<AptSnapshot>({ op: "apt_status" });
}

/** apt-get update puis nouvel état : peut durer quelques dizaines de secondes. */
export function aptCheck() {
    return gate<AptSnapshot>({ op: "apt_update" }, undefined, 300_000);
}

export type AptUpgradeResult =
    | { ok: true }
    | { ok: false; blocked: true; blockers: PlugBlocker[] }
    | { ok: false; blocked: false; error: string };

/**
 * Lance apt-get upgrade. Mettre Plex à jour le redémarre et coupe les lectures :
 * on refuse tant que quelqu'un regarde quelque chose, sauf `force`.
 */
export async function aptUpgrade(force: boolean): Promise<AptUpgradeResult> {
    const playback = await probePlayback();
    if (playback.state === "blocked" && !force) {
        return { ok: false, blocked: true, blockers: [{ kind: "playback", detail: playback.detail }] };
    }
    const r = await gate<{ started: true }>({ op: "apt_upgrade" }, undefined, 60_000);
    if (!r.ok) return { ok: false, blocked: false, error: r.error };
    return { ok: true };
}
