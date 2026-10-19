"use client";

import { useState } from "react";
import { Dialog } from "../../_components/dialog";

/** Saisie d'un nom (création ou renommage), partagée par les deux dialogues. */
export function NameDialog({
    title,
    submitLabel,
    initialName = "",
    placeholder,
    onConfirm,
    onClose,
}: {
    title: string;
    submitLabel: string;
    initialName?: string;
    placeholder?: string;
    onConfirm: (name: string) => void;
    onClose: () => void;
}) {
    const [name, setName] = useState(initialName);

    function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        const trimmed = name.trim();
        if (!trimmed || trimmed === initialName) {
            onClose();
            return;
        }
        onConfirm(trimmed);
    }

    return (
        <Dialog
            title={title}
            onClose={onClose}
            footer={
                <>
                    <button type="button" onClick={onClose} className="btn btn-secondary">
                        Annuler
                    </button>
                    <button type="submit" form="name-dialog" disabled={!name.trim()} className="btn btn-primary">
                        {submitLabel}
                    </button>
                </>
            }
        >
            <form id="name-dialog" onSubmit={handleSubmit}>
                <label>
                    <span className="label">Nom</span>
                    <input
                        autoFocus
                        onFocus={(e) => e.currentTarget.select()}
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder={placeholder}
                        maxLength={255}
                        className="input"
                    />
                </label>
            </form>
        </Dialog>
    );
}

export function NewFolderDialog({
    onConfirm,
    onClose,
}: {
    onConfirm: (name: string) => void;
    onClose: () => void;
}) {
    return (
        <NameDialog
            title="Nouveau dossier"
            submitLabel="Créer"
            placeholder="Nom du dossier"
            onConfirm={onConfirm}
            onClose={onClose}
        />
    );
}
