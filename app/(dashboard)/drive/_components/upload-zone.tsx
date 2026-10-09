"use client";

import { useRef, useState } from "react";

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
                setProgress((prev) => prev.map((p) => ({ ...p, percent: 100, done: true })));
                setTimeout(() => {
                    setProgress([]);
                    onUploaded();
                }, 800);
                resolve();
            };

            xhr.onerror = () => {
                setProgress((prev) =>
                    prev.map((p) => ({ ...p, done: true, error: "Erreur réseau" })),
                );
                resolve();
            };

            xhr.send(formData);
        });
    }

    function onDragOver(e: React.DragEvent) {
        e.preventDefault();
        setDragging(true);
    }
    function onDragLeave() {
        setDragging(false);
    }
    function onDrop(e: React.DragEvent) {
        e.preventDefault();
        setDragging(false);
        if (e.dataTransfer.files.length) uploadFiles(e.dataTransfer.files);
    }

    return (
        <div className="flex flex-col gap-3">
            <div
                onDragOver={onDragOver}
                onDragLeave={onDragLeave}
                onDrop={onDrop}
                onClick={() => inputRef.current?.click()}
                className={`flex cursor-pointer flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed px-6 py-8 text-center transition-colors ${
                    dragging
                        ? "border-mauve bg-mauve/5 text-mauve-text"
                        : "border-hairline-strong text-text-muted hover:border-mauve/40 hover:text-text-main"
                }`}
            >
                <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-8 w-8 opacity-60"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={1.5}
                >
                    <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5"
                    />
                </svg>
                <p className="text-sm font-medium">
                    Glissez des fichiers ici ou{" "}
                    <span className="text-mauve-text underline underline-offset-2">parcourez</span>
                </p>
                <input
                    ref={inputRef}
                    type="file"
                    multiple
                    className="sr-only"
                    onChange={(e) => e.target.files && uploadFiles(e.target.files)}
                />
            </div>

            {progress.length > 0 && (
                <div className="flex flex-col gap-2">
                    {progress.map((p, i) => (
                        <div key={i} className="rounded-xl border border-hairline bg-raised px-4 py-2">
                            <div className="mb-1.5 flex items-center justify-between gap-2">
                                <span className="truncate text-xs text-text-main">{p.name}</span>
                                <span className="shrink-0 font-mono text-[10px] text-text-muted">
                                    {p.error ? "Erreur" : p.done ? "✓" : `${p.percent}%`}
                                </span>
                            </div>
                            <div className="h-1 w-full overflow-hidden rounded-full bg-hairline-strong">
                                <div
                                    className={`h-full rounded-full transition-all ${p.error ? "bg-down" : "bg-mauve"}`}
                                    style={{ width: `${p.percent}%` }}
                                />
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
