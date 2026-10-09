"use client";

import { useEffect, useRef } from "react";

type Action =
    | { label: string; onClick: () => void; danger?: boolean }

export function ContextMenu({
    x,
    y,
    actions,
    onClose,
}: {
    x: number;
    y: number;
    actions: Action[];
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
        return () => {
            document.removeEventListener("mousedown", handleClick);
            document.removeEventListener("keydown", handleKey);
        };
    }, [onClose]);

    // Keep menu inside viewport
    const menuW = 180;
    const menuH = actions.length * 36 + 8;
    const left = Math.min(x, window.innerWidth - menuW - 8);
    const top = Math.min(y, window.innerHeight - menuH - 8);

    return (
        <div
            ref={ref}
            role="menu"
            style={{ position: "fixed", left, top, zIndex: 9999, minWidth: menuW }}
            className="glass-panel rounded-xl py-1 shadow-xl"
        >
            {actions.map((action) => (
                <button
                    key={action.label}
                    role="menuitem"
                    onClick={() => {
                        action.onClick();
                        onClose();
                    }}
                    className={`flex w-full items-center px-4 py-2 text-left text-sm transition-colors hover:bg-glass ${
                        action.danger ? "text-down hover:text-down" : "text-text-main"
                    }`}
                >
                    {action.label}
                </button>
            ))}
        </div>
    );
}
