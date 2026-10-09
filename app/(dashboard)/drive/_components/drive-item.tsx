"use client";

type FolderEntry = { id: string; name: string; createdAt: string; updatedAt: string };
type FileEntry = { id: string; name: string; size: number; mimeType: string; createdAt: string };

function formatSize(bytes: number) {
    if (bytes < 1024) return `${bytes} o`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} Ko`;
    if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} Mo`;
    return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} Go`;
}

function FolderIcon({ className }: { className?: string }) {
    return (
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className={className}>
            <path d="M19.5 21a3 3 0 003-3v-4.5a3 3 0 00-3-3h-15a3 3 0 00-3 3V18a3 3 0 003 3h15zM1.5 10.146V6a3 3 0 013-3h5.379a2.25 2.25 0 011.59.659l2.122 2.121c.14.141.331.22.53.22H19.5a3 3 0 013 3v1.146A4.483 4.483 0 0019.5 9h-15a4.483 4.483 0 00-3 1.146z" />
        </svg>
    );
}

function FileIcon({ className }: { className?: string }) {
    return (
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className={className}>
            <path d="M5.625 1.5c-1.036 0-1.875.84-1.875 1.875v17.25c0 1.035.84 1.875 1.875 1.875h12.75c1.035 0 1.875-.84 1.875-1.875V12.75A3.75 3.75 0 0016.5 9h-1.875a1.875 1.875 0 01-1.875-1.875V5.25A3.75 3.75 0 009 1.5H5.625z" />
            <path d="M12.971 1.816A5.23 5.23 0 0114.25 5.25v1.875c0 .207.168.375.375.375H16.5a5.23 5.23 0 013.434 1.279 9.768 9.768 0 00-6.963-6.963z" />
        </svg>
    );
}

function DotsIcon({ className }: { className?: string }) {
    return (
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className={className}>
            <path fillRule="evenodd" d="M4.5 12a1.5 1.5 0 113 0 1.5 1.5 0 01-3 0zm6 0a1.5 1.5 0 113 0 1.5 1.5 0 01-3 0zm6 0a1.5 1.5 0 113 0 1.5 1.5 0 01-3 0z" clipRule="evenodd" />
        </svg>
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
            onDoubleClick={onOpen}
            onContextMenu={(e) => { e.preventDefault(); onMenu(e); }}
            className="group flex cursor-pointer items-center gap-3 rounded-xl border border-hairline bg-raised px-4 py-3 transition-colors hover:border-hairline-strong hover:bg-glass"
        >
            <FolderIcon className="h-5 w-5 shrink-0 text-gold" />
            <span className="min-w-0 flex-1 truncate text-sm font-medium text-text-main">
                {folder.name}
            </span>
            <button
                onClick={(e) => { e.stopPropagation(); onMenu(e); }}
                aria-label="Options"
                className="shrink-0 rounded-lg p-1 text-text-muted opacity-0 transition-opacity hover:bg-glass hover:text-text-main group-hover:opacity-100"
            >
                <DotsIcon className="h-4 w-4" />
            </button>
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
    return (
        <div
            onContextMenu={(e) => { e.preventDefault(); onMenu(e); }}
            className="group flex cursor-default items-center gap-3 rounded-xl border border-hairline bg-raised px-4 py-3 transition-colors hover:border-hairline-strong hover:bg-glass"
        >
            <FileIcon className="h-5 w-5 shrink-0 text-mauve-text" />
            <span className="min-w-0 flex-1 truncate text-sm font-medium text-text-main">
                {file.name}
            </span>
            <span className="shrink-0 font-mono text-[11px] text-text-muted">
                {formatSize(file.size)}
            </span>
            <button
                onClick={(e) => { e.stopPropagation(); onMenu(e); }}
                aria-label="Options"
                className="shrink-0 rounded-lg p-1 text-text-muted opacity-0 transition-opacity hover:bg-glass hover:text-text-main group-hover:opacity-100"
            >
                <DotsIcon className="h-4 w-4" />
            </button>
        </div>
    );
}
