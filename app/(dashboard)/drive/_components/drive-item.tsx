"use client";

import type { LucideIcon } from "lucide-react";
import {
    File,
    FileArchive,
    FileAudio,
    FileCode,
    FileImage,
    FileSpreadsheet,
    FileText,
    FileVideo,
    Folder,
    MoreHorizontal,
} from "lucide-react";
import { formatDate } from "@/lib/format";

type FolderEntry = { id: string; name: string; createdAt: string; updatedAt: string };
type FileEntry = { id: string; name: string; size: number; mimeType: string; createdAt: string };

function formatSize(bytes: number) {
    if (bytes < 1024) return `${bytes} o`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1).replace(".", ",")} Ko`;
    if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1).replace(".", ",")} Mo`;
    return `${(bytes / (1024 * 1024 * 1024)).toFixed(2).replace(".", ",")} Go`;
}

function fileIcon(mime: string, name: string): { icon: LucideIcon; color: string } {
    if (mime.startsWith("image/")) return { icon: FileImage, color: "text-info" };
    if (mime.startsWith("video/")) return { icon: FileVideo, color: "text-down" };
    if (mime.startsWith("audio/")) return { icon: FileAudio, color: "text-warn" };
    if (mime === "application/pdf") return { icon: FileText, color: "text-down" };
    if (/zip|tar|gzip|rar|7z/.test(mime)) return { icon: FileArchive, color: "text-warn" };
    if (/sheet|excel|csv/.test(mime)) return { icon: FileSpreadsheet, color: "text-ok" };
    if (/json|javascript|typescript|html|css|xml|x-sh/.test(mime) || /\.(ts|tsx|js|py|sh|yml|yaml)$/.test(name))
        return { icon: FileCode, color: "text-accent-fg" };
    if (mime.startsWith("text/") || /word|document/.test(mime)) return { icon: FileText, color: "text-fg-muted" };
    return { icon: File, color: "text-fg-subtle" };
}

function MenuButton({ onMenu }: { onMenu: (e: React.MouseEvent) => void }) {
    return (
        <button
            type="button"
            onClick={(e) => {
                e.stopPropagation();
                onMenu(e);
            }}
            aria-label="Actions"
            className="btn btn-ghost h-7 w-7 px-0 opacity-100 group-hover:opacity-100 sm:opacity-0 sm:focus:opacity-100"
        >
            <MoreHorizontal className="h-4 w-4" />
        </button>
    );
}

const rowClass =
    "group grid grid-cols-[1fr_auto] items-center gap-4 px-4 py-2 text-[13px] transition-colors hover:bg-elevated/50 sm:grid-cols-[1fr_6rem_8rem_2rem]";

export function DriveHeaderRow() {
    return (
        <div className="hidden grid-cols-[1fr_6rem_8rem_2rem] gap-4 border-b border-line px-4 py-2.5 text-xs font-medium text-fg-subtle sm:grid">
            <span>Nom</span>
            <span className="text-right">Taille</span>
            <span className="text-right">Ajouté le</span>
            <span />
        </div>
    );
}

export function FolderItem({
    folder,
    onOpen,
    onMenu,
}: {
    folder: FolderEntry;
    onOpen: () => void;
    onMenu: (e: React.MouseEvent) => void;
}) {
    return (
        <div
            onContextMenu={(e) => {
                e.preventDefault();
                onMenu(e);
            }}
            className={rowClass}
        >
            <button type="button" onClick={onOpen} className="flex min-w-0 items-center gap-3 text-left">
                <Folder className="h-4 w-4 shrink-0 fill-accent/20 text-accent-fg" strokeWidth={1.75} />
                <span className="truncate font-medium text-fg hover:underline">{folder.name}</span>
            </button>
            <span className="hidden text-right text-xs text-fg-subtle sm:block">—</span>
            <span className="tabular hidden text-right text-xs text-fg-muted sm:block">
                {formatDate(new Date(folder.createdAt))}
            </span>
            <MenuButton onMenu={onMenu} />
        </div>
    );
}

export function FileItem({
    file,
    onMenu,
}: {
    file: FileEntry;
    onMenu: (e: React.MouseEvent) => void;
}) {
    const { icon: Icon, color } = fileIcon(file.mimeType, file.name);
    return (
        <div
            onContextMenu={(e) => {
                e.preventDefault();
                onMenu(e);
            }}
            className={rowClass}
        >
            <a
                href={`/api/drive/files/${file.id}/download`}
                className="flex min-w-0 items-center gap-3"
                title="Télécharger"
            >
                <Icon className={`h-4 w-4 shrink-0 ${color}`} strokeWidth={1.75} />
                <span className="truncate text-fg hover:underline">{file.name}</span>
            </a>
            <span className="tabular hidden text-right text-xs text-fg-muted sm:block">{formatSize(file.size)}</span>
            <span className="tabular hidden text-right text-xs text-fg-muted sm:block">
                {formatDate(new Date(file.createdAt))}
            </span>
            <MenuButton onMenu={onMenu} />
        </div>
    );
}
