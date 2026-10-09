"use client";

import { useEffect, useRef, useState } from "react";

export function NewFolderDialog({
    onConfirm,
    onClose,
}: {
    onConfirm: (name: string) => void;
    onClose: () => void;
}) {
    const [name, setName] = useState("");
    const inputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        inputRef.current?.focus();
    }, []);

    useEffect(() => {
        function handleKey(e: KeyboardEvent) {
            if (e.key === "Escape") onClose();
        }
        document.addEventListener("keydown", handleKey);
        return () => document.removeEventListener("keydown", handleKey);
    }, [onClose]);

    function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        const trimmed = name.trim();
        if (!trimmed) return;
        onConfirm(trimmed);
    }

    return (
        <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-ink/70 backdrop-blur-sm"
            onClick={(e) => e.target === e.currentTarget && onClose()}
        >
            <div className="glass-panel w-full max-w-sm rounded-2xl p-6 shadow-2xl">
                <h2 className="font-serif text-lg font-bold text-text-main">Nouveau dossier</h2>
                <form onSubmit={handleSubmit} className="mt-4 flex flex-col gap-4">
                    <input
                        ref={inputRef}
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="Nom du dossier"
                        maxLength={255}
                        className="w-full rounded-xl border border-hairline-strong bg-ink/60 px-4 py-2.5 text-sm text-text-main placeholder:text-text-muted focus:border-mauve/60 focus:outline-none"
                    />
                    <div className="flex justify-end gap-3">
                        <button
                            type="button"
                            onClick={onClose}
                            className="rounded-xl px-4 py-2 text-sm text-text-muted transition-colors hover:text-text-main"
                        >
                            Annuler
                        </button>
                        <button
                            type="submit"
                            disabled={!name.trim()}
                            className="rounded-xl bg-mauve/80 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-mauve disabled:opacity-40"
                        >
                            Créer
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
