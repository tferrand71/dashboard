"use client";

import { useRef, useState } from "react";
import { CheckCircle2, CloudUpload, XCircle } from "lucide-react";

type UploadProgress = { name: string; percent: number; done: boolean; error?: string };

export function UploadZone({
    folderId,
    onUploaded,
}: {
    folderId: string | null;
    onUploaded: () => void;
}) {
    const inputRef = useRef<HTMLInputElement>(null);
    const [dragging, setDragging] = useState(false);
    const [progress, setProgress] = useState<UploadProgress[]>([]);

    async function uploadFiles(files: FileList | File[]) {
        const fileArray = Array.from(files);
        if (!fileArray.length) return;

        setProgress(fileArray.map((f) => ({ name: f.name, percent: 0, done: false })));

        const formData = new FormData();
        if (folderId) formData.append("folderId", folderId);
        fileArray.forEach((f) => formData.append("file", f));

        await new Promise<void>((resolve) => {
            const xhr = new XMLHttpRequest();
            xhr.open("POST", "/api/drive/upload");

            xhr.upload.onprogress = (e) => {
                if (!e.lengthComputable) return;
                const percent = Math.round((e.loaded / e.total) * 100);
                setProgress((prev) => prev.map((p) => ({ ...p, percent })));
            };

            xhr.onload = () => {
                const failed = xhr.status >= 400;
                setProgress((prev) =>
                    prev.map((p) => ({ ...p, percent: 100, done: true, error: failed ? `Erreur ${xhr.status}` : undefined })),
                );
                setTimeout(
                    () => {
                        setProgress([]);
                        onUploaded();
                    },
                    failed ? 3000 : 800,
                );
                resolve();
            };

            xhr.onerror = () => {
                setProgress((prev) => prev.map((p) => ({ ...p, done: true, error: "Erreur réseau" })));
                resolve();
            };

            xhr.send(formData);
        });
    }

    return (
        <div className="space-y-2">
            <button
                type="button"
                onDragOver={(e) => {
                    e.preventDefault();
                    setDragging(true);
                }}
                onDragLeave={() => setDragging(false)}
                onDrop={(e) => {
                    e.preventDefault();
                    setDragging(false);
                    if (e.dataTransfer.files.length) uploadFiles(e.dataTransfer.files);
                }}
                onClick={() => inputRef.current?.click()}
                className={`flex w-full items-center justify-center gap-3 rounded-lg border border-dashed px-4 py-5 text-[13px] transition-colors ${
                    dragging
                        ? "border-accent bg-accent/5 text-fg"
                        : "border-line-strong text-fg-muted hover:border-fg-subtle hover:bg-elevated/40 hover:text-fg"
                }`}
            >
                <CloudUpload className="h-5 w-5 shrink-0 text-fg-subtle" strokeWidth={1.75} />
                <span>
                    Glisse des fichiers ici ou <span className="font-medium text-accent-fg">parcours ton ordinateur</span>
                </span>
            </button>
            <input
                ref={inputRef}
                type="file"
                multiple
                className="sr-only"
                tabIndex={-1}
                onChange={(e) => e.target.files && uploadFiles(e.target.files)}
            />

            {progress.length > 0 && (
                <ul className="card divide-y divide-line">
                    {progress.map((p, i) => (
                        <li key={i} className="flex items-center gap-3 px-4 py-2.5">
                            <div className="min-w-0 flex-1">
                                <div className="mb-1.5 flex items-center justify-between gap-2">
                                    <span className="truncate text-[13px] text-fg">{p.name}</span>
                                    <span className="tabular shrink-0 text-xs text-fg-subtle">
                                        {p.error ?? (p.done ? "Terminé" : `${p.percent} %`)}
                                    </span>
                                </div>
                                <div className="h-1 w-full overflow-hidden rounded-full bg-line">
                                    <div
                                        className={`h-full rounded-full transition-all ${p.error ? "bg-down" : p.done ? "bg-ok" : "bg-accent"}`}
                                        style={{ width: `${p.percent}%` }}
                                    />
                                </div>
                            </div>
                            {p.done &&
                                (p.error ? (
                                    <XCircle className="h-4 w-4 shrink-0 text-down" />
                                ) : (
                                    <CheckCircle2 className="h-4 w-4 shrink-0 text-ok" />
                                ))}
                        </li>
                    ))}
                </ul>
            )}
        </div>
    );
}
