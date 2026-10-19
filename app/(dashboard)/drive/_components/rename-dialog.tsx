"use client";

import { NameDialog } from "./new-folder-dialog";

export function RenameDialog({
    initialName,
    onConfirm,
    onClose,
}: {
    initialName: string;
    onConfirm: (name: string) => void;
    onClose: () => void;
}) {
    return (
        <NameDialog
            title="Renommer"
            submitLabel="Renommer"
            initialName={initialName}
            onConfirm={onConfirm}
            onClose={onClose}
        />
    );
}
