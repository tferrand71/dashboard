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
