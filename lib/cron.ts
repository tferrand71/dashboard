/** Formes renvoyées par deploy-cron, lues côté client via /api/cron/*. */

export type ScheduleKind = "once" | "cron";

export type Schedule = {
    id: string;
    project: string;
    kind: ScheduleKind;
    /** Instant d'exécution des programmations « une fois » (ISO, UTC). */
    runAt?: string;
    /** Expression cron à 5 champs des programmations récurrentes. */
    cron?: string;
    /** Prochaine exécution d'une récurrente (ISO, UTC). */
    nextRun?: string | null;
    note: string;
    enabled: boolean;
    createdAt: string;
    lastRun?: { at: string; outcome: string; ok: boolean };
};

export type HistoryEntry = {
    at: string;
    scheduleId: string;
    project: string;
    kind: ScheduleKind;
    /** « succès », « déployé, site injoignable », « échec », « manqué » ou « interrompu ». */
    outcome: string;
    ok: boolean;
    commit: string | null;
    durationSec: number | null;
    siteCode: number | null;
    error: string | null;
};

export type CronState = {
    timezone: string;
    now: string;
    daemon: { alive: boolean; lastBeatSeconds: number | null };
    running: { id: string; project: string; startedAt: string } | null;
    schedules: Schedule[];
    history: HistoryEntry[];
};

/** Instant prévu d'une programmation, ou null s'il n'y en a plus. */
export function scheduleTime(s: Schedule): string | null {
    return (s.kind === "once" ? s.runAt : s.nextRun) ?? null;
}

/** « dim. 15 nov. à 03:00 », dans le fuseau donné (les heures affichées sont celles de Paris). */
export function formatWhen(iso: string, timeZone: string): string {
    const parts = new Intl.DateTimeFormat("fr-FR", {
        timeZone,
        weekday: "short",
        day: "numeric",
        month: "short",
        hour: "2-digit",
        minute: "2-digit",
        hourCycle: "h23",
    }).formatToParts(new Date(iso));
    const get = (type: string) => parts.find((p) => p.type === type)?.value ?? "";
    return `${get("weekday")} ${get("day")} ${get("month")} à ${get("hour")}:${get("minute")}`;
}

/** Délai lisible avant une échéance : « dans 10 h 08 min », « dans 2 min », « imminent ». */
export function formatIn(ms: number): string {
    if (ms <= 0) return "imminent";
    if (ms < 60_000) return "dans moins d'une minute";
    const totalMin = Math.round(ms / 60_000);
    const days = Math.floor(totalMin / 1440);
    const hours = Math.floor((totalMin % 1440) / 60);
    const mins = totalMin % 60;
    if (days) return `dans ${days} j${hours ? ` ${hours} h` : ""}`;
    if (hours) return `dans ${hours} h${mins ? ` ${String(mins).padStart(2, "0")} min` : ""}`;
    return `dans ${mins} min`;
}

const WEEKDAYS = ["dimanche", "lundi", "mardi", "mercredi", "jeudi", "vendredi", "samedi", "dimanche"];

/** Décrit une expression cron en français quand elle est simple, sinon la renvoie telle quelle. */
export function describeRecurrence(cron: string): string {
    const m = /^(\d{1,2}) (\d{1,2}) \* \* (\*|[0-7])$/.exec(cron.trim());
    if (m) {
        const time = `${m[2].padStart(2, "0")}:${m[1].padStart(2, "0")}`;
        return m[3] === "*" ? `Chaque jour à ${time}` : `Chaque ${WEEKDAYS[Number(m[3])]} à ${time}`;
    }
    return `Cron ${cron}`;
}

type Tone = "ok" | "warn" | "down" | "info" | "neutral";

/** Couleur du badge de résultat d'un déploiement programmé. */
export function outcomeTone(outcome: string): Tone {
    switch (outcome) {
        case "succès":
            return "ok";
        case "échec":
            return "down";
        case "déployé, site injoignable":
        case "manqué":
        case "interrompu":
            return "warn";
        default:
            return "neutral";
    }
}
