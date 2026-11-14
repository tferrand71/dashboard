"use client";

import { useState } from "react";
import { CalendarClock, Loader2, Repeat, Terminal } from "lucide-react";
import type { AgentProject } from "@/lib/agent";
import { Dialog } from "../../_components/dialog";
import { ErrorBanner } from "../../_components/ui";

type Mode = "once" | "daily" | "cron";
/** « custom » = date et heure choisies dans le sélecteur ; les autres sont des raccourcis. */
type OncePreset = "tonight" | "tomorrow" | "soon" | "custom";

const MODES: { id: Mode; label: string; icon: typeof CalendarClock }[] = [
    { id: "once", label: "Une fois", icon: CalendarClock },
    { id: "daily", label: "Chaque jour", icon: Repeat },
    { id: "cron", label: "Avancé", icon: Terminal },
];

/** `when` est interprété par deploy-cron (heure de Paris) : « 03:00 » = la prochaine fois qu'il est 03:00. */
const ONCE_PRESETS: { id: Exclude<OncePreset, "custom">; label: string; hint: string; when: string }[] = [
    { id: "tonight", label: "Cette nuit", hint: "à 03:00", when: "03:00" },
    { id: "tomorrow", label: "Demain", hint: "à 03:00", when: "demain 03:00" },
    { id: "soon", label: "Dans 1 heure", hint: "", when: "+1h" },
];

const CRON_EXAMPLES = [
    { label: "Chaque nuit à 3 h", cron: "0 3 * * *" },
    { label: "Le lundi à 3 h", cron: "0 3 * * 1" },
    { label: "Toutes les 6 h", cron: "0 */6 * * *" },
];

/**
 * Programmation d'un déploiement d'un projet. Le serveur (deploy-cron) valide tout et interprète les heures
 * en heure de Paris : ce formulaire ne fait que transmettre ce qui a été choisi.
 */
export function ScheduleDialog({
    project,
    onClose,
    onScheduled,
}: {
    project: AgentProject;
    onClose: () => void;
    onScheduled: () => void;
}) {
    const [mode, setMode] = useState<Mode>("once");
    const [preset, setPreset] = useState<OncePreset>("tonight");
    const [customDate, setCustomDate] = useState("");
    const [time, setTime] = useState("03:00");
    const [cron, setCron] = useState("0 3 * * *");
    const [note, setNote] = useState("");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    function buildBody(): Record<string, string> | null {
        const base = { project: project.name, note };
        if (mode === "daily") return { ...base, mode, time };
        if (mode === "cron") return { ...base, mode, cron };
        if (preset === "custom") {
            if (!customDate) {
                setError("Choisis une date et une heure.");
                return null;
            }
            // « 2026-11-15T03:00 » → « 2026-11-15 03:00 » : l'heure saisie est celle de Paris
            return { ...base, mode, when: customDate.replace("T", " ") };
        }
        return { ...base, mode, when: ONCE_PRESETS.find((p) => p.id === preset)!.when };
    }

    async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
        e.preventDefault();
        setError(null);
        const body = buildBody();
        if (!body) return;

        setLoading(true);
        try {
            const res = await fetch("/api/cron/schedules", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(body),
            });
            if (!res.ok) {
                const data = await res.json().catch(() => ({}));
                setError(data.error ?? "Programmation impossible");
                return;
            }
            onScheduled();
            onClose();
        } catch {
            setError("Le dashboard n'a pas pu joindre deploy-cron.");
        } finally {
            setLoading(false);
        }
    }

    return (
        <Dialog
            title={`Programmer le déploiement de ${project.name}`}
            description="Le projet sera reconstruit depuis la dernière version de sa branche, puis le site sera contrôlé. Heures de Paris."
            onClose={onClose}
            size="md"
            footer={
                <>
                    <button type="button" onClick={onClose} className="btn btn-secondary">
                        Annuler
                    </button>
                    <button type="submit" form="schedule-form" disabled={loading} className="btn btn-primary">
                        {loading && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                        {loading ? "Programmation…" : "Programmer"}
                    </button>
                </>
            }
        >
            <form id="schedule-form" onSubmit={handleSubmit} className="space-y-4">
                {error && <ErrorBanner>{error}</ErrorBanner>}

                <div role="radiogroup" aria-label="Fréquence" className="grid grid-cols-3 gap-1 rounded-md border border-line bg-canvas p-1">
                    {MODES.map(({ id, label, icon: Icon }) => (
                        <button
                            key={id}
                            type="button"
                            role="radio"
                            aria-checked={mode === id}
                            onClick={() => setMode(id)}
                            className={`inline-flex h-8 items-center justify-center gap-1.5 rounded text-[13px] font-medium transition-colors ${
                                mode === id ? "bg-accent/15 text-accent-fg" : "text-fg-muted hover:text-fg"
                            }`}
                        >
                            <Icon className="h-3.5 w-3.5" />
                            {label}
                        </button>
                    ))}
                </div>

                {mode === "once" && (
                    <div className="space-y-3">
                        <div role="radiogroup" aria-label="Quand" className="grid gap-2 sm:grid-cols-3">
                            {ONCE_PRESETS.map((p) => (
                                <PresetButton
                                    key={p.id}
                                    selected={preset === p.id}
                                    onClick={() => setPreset(p.id)}
                                    label={p.label}
                                    hint={p.hint}
                                />
                            ))}
                        </div>
                        <PresetButton
                            selected={preset === "custom"}
                            onClick={() => setPreset("custom")}
                            label="Choisir une date et une heure"
                            hint=""
                            wide
                        />
                        {preset === "custom" && (
                            <label className="block">
                                <span className="label">Date et heure (Paris)</span>
                                <input
                                    type="datetime-local"
                                    value={customDate}
                                    onChange={(e) => setCustomDate(e.target.value)}
                                    className="input [color-scheme:dark]"
                                    autoFocus
                                />
                            </label>
                        )}
                    </div>
                )}

                {mode === "daily" && (
                    <label className="block">
                        <span className="label">Heure (Paris)</span>
                        <input
                            type="time"
                            value={time}
                            onChange={(e) => setTime(e.target.value)}
                            required
                            className="input w-36 [color-scheme:dark]"
                        />
                        <span className="mt-1.5 block text-xs text-fg-subtle">
                            Redéploie le projet tous les jours à cette heure, jusqu&apos;à ce que tu annules la programmation.
                        </span>
                    </label>
                )}

                {mode === "cron" && (
                    <div className="space-y-2">
                        <label className="block">
                            <span className="label">Expression cron (5 champs)</span>
                            <input
                                value={cron}
                                onChange={(e) => setCron(e.target.value)}
                                required
                                spellCheck={false}
                                autoComplete="off"
                                className="input font-mono text-[13px]"
                                placeholder="0 3 * * 1"
                            />
                            <span className="mt-1.5 block text-xs text-fg-subtle">
                                minute · heure · jour du mois · mois · jour de la semaine (0 = dimanche)
                            </span>
                        </label>
                        <div className="flex flex-wrap gap-1.5">
                            {CRON_EXAMPLES.map((ex) => (
                                <button
                                    key={ex.cron}
                                    type="button"
                                    onClick={() => setCron(ex.cron)}
                                    className="rounded-full border border-line-strong bg-elevated px-2.5 py-1 text-[11px] text-fg-muted transition-colors hover:border-accent/50 hover:text-fg"
                                >
                                    {ex.label} <span className="font-mono text-fg-subtle">{ex.cron}</span>
                                </button>
                            ))}
                        </div>
                    </div>
                )}

                <label className="block">
                    <span className="label">
                        Note <span className="font-normal text-fg-subtle">(facultatif)</span>
                    </span>
                    <input
                        value={note}
                        onChange={(e) => setNote(e.target.value)}
                        maxLength={200}
                        placeholder="Ex. : mise en ligne du nouveau logo"
                        className="input"
                    />
                </label>
            </form>
        </Dialog>
    );
}

function PresetButton({
    selected,
    onClick,
    label,
    hint,
    wide = false,
}: {
    selected: boolean;
    onClick: () => void;
    label: string;
    hint: string;
    wide?: boolean;
}) {
    return (
        <button
            type="button"
            role="radio"
            aria-checked={selected}
            onClick={onClick}
            className={`rounded-md border px-3 py-2 text-left text-[13px] transition-colors ${wide ? "w-full" : ""} ${
                selected
                    ? "border-accent/60 bg-accent/10 text-fg"
                    : "border-line-strong bg-elevated text-fg-muted hover:border-accent/40 hover:text-fg"
            }`}
        >
            <span className="font-medium">{label}</span>
            {hint && <span className="ml-1.5 text-fg-subtle">{hint}</span>}
        </button>
    );
}
