/** Octets → « 1,8 Go », « 512 Mo » (unités françaises). */
export function formatBytes(bytes: number): string {
    if (bytes >= 1024 ** 3) return `${(bytes / 1024 ** 3).toFixed(1).replace(".", ",")} Go`;
    if (bytes >= 1024 ** 2) return `${Math.round(bytes / 1024 ** 2)} Mo`;
    if (bytes >= 1024) return `${Math.round(bytes / 1024)} Ko`;
    return `${bytes} o`;
}

export function formatPercent(value: number, digits = 1): string {
    return `${value.toFixed(digits).replace(".", ",")} %`;
}

const relative = new Intl.RelativeTimeFormat("fr-FR", { numeric: "auto" });

/** « il y a 3 minutes », « hier » — pour les dates de déploiement. */
export function timeAgo(input: string | Date, now: Date = new Date()): string {
    const seconds = Math.round((new Date(input).getTime() - now.getTime()) / 1000);
    const abs = Math.abs(seconds);
    if (abs < 45) return "à l'instant";
    if (abs < 3600) return relative.format(Math.round(seconds / 60), "minute");
    if (abs < 86400) return relative.format(Math.round(seconds / 3600), "hour");
    if (abs < 86400 * 30) return relative.format(Math.round(seconds / 86400), "day");
    return formatDate(new Date(input));
}

/** « 3 j 4 h », « 12 min » — unités françaises, pas de décimales inutiles. */
export function formatDuration(totalSeconds: number): string {
    if (totalSeconds < 60) return `${totalSeconds} s`;

    const minutes = Math.floor(totalSeconds / 60);
    if (minutes < 60) return `${minutes} min`;

    const hours = Math.floor(minutes / 60);
    if (hours < 24) {
        const restMinutes = minutes % 60;
        return restMinutes ? `${hours} h ${restMinutes} min` : `${hours} h`;
    }

    const days = Math.floor(hours / 24);
    const restHours = hours % 24;
    return restHours ? `${days} j ${restHours} h` : `${days} j`;
}

const dateFormatter = new Intl.DateTimeFormat("fr-FR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    timeZone: "Europe/Paris",
});

export function formatDate(date: Date): string {
    return dateFormatter.format(date);
}

const hourFormatter = new Intl.DateTimeFormat("fr-FR", {
    hour: "numeric",
    hourCycle: "h23",
    timeZone: "Europe/Paris",
});

/**
 * Salutation calée sur l'heure de Paris, pas sur l'heure du conteneur.
 * On lit la partie `hour` plutôt que la chaîne formatée : en français,
 * une heure seule se rend « 14 h », que `Number()` interprète en NaN.
 */
export function getGreeting(now: Date = new Date()): string {
    const hourPart = hourFormatter
        .formatToParts(now)
        .find((part) => part.type === "hour");
    const hour = Number(hourPart?.value);

    if (!Number.isFinite(hour)) return "Bonjour";
    if (hour < 6) return "Bonne nuit";
    if (hour < 18) return "Bonjour";
    return "Bonsoir";
}
