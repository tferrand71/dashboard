"use client";

import { useState } from "react";
import { CalendarClock } from "lucide-react";
import type { AgentProject } from "@/lib/agent";
import { ScheduleDialog } from "./schedule-dialog";

/** Bouton « Programmer un déploiement » d'un projet : ouvre la fenêtre de programmation. */
export function ScheduleButton({ project, onScheduled }: { project: AgentProject; onScheduled: () => void }) {
    const [open, setOpen] = useState(false);

    return (
        <>
            <button
                type="button"
                onClick={() => setOpen(true)}
                title="Programmer un déploiement"
                className="btn btn-ghost h-7 w-7 px-0"
            >
                <CalendarClock className="h-3.5 w-3.5" />
                <span className="sr-only">Programmer un déploiement de {project.name}</span>
            </button>

            {open && <ScheduleDialog project={project} onClose={() => setOpen(false)} onScheduled={onScheduled} />}
        </>
    );
}
