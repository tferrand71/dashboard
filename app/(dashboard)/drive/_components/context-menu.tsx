"use client";

import { useEffect, useRef } from "react";
import type { LucideIcon } from "lucide-react";

export type MenuAction = { label: string; icon?: LucideIcon; onClick: () => void; danger?: boolean };

export function ContextMenu({
    x,
    y,
    actions,
    onClose,
}: {
    x: number;
    y: number;
    actions: MenuAction[];
    onClose: () => void;
}) {
    const ref = useRef<HTMLDivElement>(null);

    useEffect(() => {
        function handleClick(e: MouseEvent) {
            if (ref.current && !ref.current.contains(e.target as Node)) onClose();
        }
        function handleKey(e: KeyboardEvent) {
            if (e.key === "Escape") onClose();
        }
        document.addEventListener("mousedown", handleClick);
        document.addEventListener("keydown", handleKey);
        ref.current?.querySelector<HTMLButtonElement>("button")?.focus();
        return () => {
            document.removeEventListener("mousedown", handleClick);
            document.removeEventListener("keydown", handleKey);
        };
    }, [onClose]);

    // Garde le menu dans la fenêtre
    const menuW = 180;
    const menuH = actions.length * 32 + 10;
    const left = Math.min(x, window.innerWidth - menuW - 8);
    const top = Math.min(y, window.innerHeight - menuH - 8);

    return (
        <div
            ref={ref}
            role="menu"
            style={{ position: "fixed", left, top, zIndex: 60, minWidth: menuW }}
            className="animate-fade-in rounded-md border border-line-strong bg-elevated p-1 shadow-xl shadow-black/40"
        >
            {actions.map(({ label, icon: Icon, onClick, danger }, i) => (
                <div key={label}>
                    {danger && i > 0 && <div className="my-1 h-px bg-line" />}
                    <button
                        type="button"
                        role="menuitem"
                        onClick={() => {
                            onClick();
                            onClose();
                        }}
                        className={`flex h-8 w-full items-center gap-2 rounded px-2 text-left text-[13px] transition-colors ${
                            danger ? "text-down hover:bg-down/10" : "text-fg hover:bg-line"
                        }`}
                    >
                        {Icon && <Icon className="h-3.5 w-3.5 opacity-70" />}
                        {label}
                    </button>
                </div>
            ))}
        </div>
    );
}
