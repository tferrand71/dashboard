"use client";

import { useEffect, useId, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";

/** Fenêtre modale : Échap ou clic à l'extérieur pour fermer. */
export function Dialog({
    title,
    description,
    onClose,
    children,
    footer,
    size = "sm",
}: {
    title: string;
    description?: ReactNode;
    onClose: () => void;
    children: ReactNode;
    footer?: ReactNode;
    size?: "sm" | "md";
}) {
    const titleId = useId();

    useEffect(() => {
        const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
        document.addEventListener("keydown", onKey);
        return () => document.removeEventListener("keydown", onKey);
    }, [onClose]);

    // Portail vers <body> : les cartes en verre (backdrop-filter) deviennent le
    // repère des éléments `fixed`, la modale y resterait sinon enfermée.
    return createPortal(
        <div
            className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 p-4 text-left backdrop-blur-sm sm:items-center"
            onMouseDown={(e) => e.target === e.currentTarget && onClose()}
        >
            <div
                role="dialog"
                aria-modal="true"
                aria-labelledby={titleId}
                className={`animate-fade-in w-full rounded-lg border border-line-strong bg-surface shadow-2xl shadow-black/50 ${
                    size === "md" ? "max-w-lg" : "max-w-sm"
                }`}
            >
                <div className="flex items-start justify-between gap-4 px-5 pt-5">
                    <div>
                        <h2 id={titleId} className="text-base font-semibold text-fg">
                            {title}
                        </h2>
                        {description && <p className="mt-1 text-[13px] text-fg-muted">{description}</p>}
                    </div>
                    <button type="button" onClick={onClose} className="btn btn-ghost -mr-2 -mt-1 w-8 px-0" aria-label="Fermer">
                        <X className="h-4 w-4" />
                    </button>
                </div>
                <div className="px-5 py-4">{children}</div>
                {footer && (
                    <div className="flex justify-end gap-2 rounded-b-lg border-t border-line bg-canvas/40 px-5 py-3">
                        {footer}
                    </div>
                )}
            </div>
        </div>,
        document.body,
    );
}
