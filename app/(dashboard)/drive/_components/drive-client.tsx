"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Breadcrumb } from "./breadcrumb";
import { ContextMenu } from "./context-menu";
import { FileItem, FolderItem } from "./drive-item";
import { NewFolderDialog } from "./new-folder-dialog";
import { RenameDialog } from "./rename-dialog";
import { UploadZone } from "./upload-zone";

type FolderEntry = { id: string; name: string; createdAt: string; updatedAt: string };
type FileEntry = { id: string; name: string; size: number; mimeType: string; createdAt: string };
type Crumb = { id: string | null; name: string };

type MenuState = {
    x: number;
    y: number;
    type: "folder" | "file";
    id: string;
    name: string;
};

export function DriveClient() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const folderId = searchParams.get("folder") ?? null;

    const [folders, setFolders] = useState<FolderEntry[]>([]);
    const [files, setFiles] = useState<FileEntry[]>([]);
    const [breadcrumb, setBreadcrumb] = useState<Crumb[]>([{ id: null, name: "Drive" }]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const [showNewFolder, setShowNewFolder] = useState(false);
    const [menu, setMenu] = useState<MenuState | null>(null);
    const [renameTarget, setRenameTarget] = useState<{ type: "folder" | "file"; id: string; name: string } | null>(null);

    const load = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const url = folderId ? `/api/drive/folders/${folderId}` : "/api/drive/folders";
            const res = await fetch(url);
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            const data = await res.json();
            setFolders(data.folders);
            setFiles(data.files);
            if (folderId && data.breadcrumb) {
                setBreadcrumb([{ id: null, name: "Drive" }, ...data.breadcrumb]);
            } else {
                setBreadcrumb([{ id: null, name: "Drive" }]);
            }
        } catch (e) {
            setError("Impossible de charger le contenu.");
        } finally {
            setLoading(false);
        }
    }, [folderId]);

    useEffect(() => { load(); }, [load]);

    function navigate(id: string | null) {
        const params = new URLSearchParams(searchParams.toString());
        if (id) {
            params.set("folder", id);
        } else {
            params.delete("folder");
        }
        router.push(`/drive?${params.toString()}`);
    }

    async function createFolder(name: string) {
        setShowNewFolder(false);
        const res = await fetch("/api/drive/folders", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ name, parentId: folderId }),
        });
        if (res.ok) load();
        else {
            const data = await res.json();
            alert(data.error ?? "Erreur lors de la création du dossier.");
        }
    }

    async function deleteFolder(id: string) {
        setMenu(null);
        if (!confirm("Supprimer ce dossier et tout son contenu ?")) return;
        await fetch(`/api/drive/folders/${id}`, { method: "DELETE" });
        load();
    }

    async function deleteFile(id: string) {
        setMenu(null);
        if (!confirm("Supprimer ce fichier ?")) return;
        await fetch(`/api/drive/files/${id}`, { method: "DELETE" });
        load();
    }

    async function rename(type: "folder" | "file", id: string, name: string) {
        setRenameTarget(null);
        const url = type === "folder" ? `/api/drive/folders/${id}` : `/api/drive/files/${id}`;
        const res = await fetch(url, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ name }),
        });
        if (res.ok) load();
        else {
            const data = await res.json();
            alert(data.error ?? "Erreur lors du renommage.");
        }
    }

    function openMenu(e: React.MouseEvent, type: "folder" | "file", id: string, name: string) {
        setMenu({ x: e.clientX, y: e.clientY, type, id, name });
    }

    const menuActions = menu
        ? [
              ...(menu.type === "folder"
                  ? [{ label: "Ouvrir", onClick: () => navigate(menu.id) }]
                  : [
                        {
                            label: "Télécharger",
                            onClick: () => {
                                window.location.href = `/api/drive/files/${menu.id}/download`;
                            },
                        },
                    ]),
              {
                  label: "Renommer",
                  onClick: () => setRenameTarget({ type: menu.type, id: menu.id, name: menu.name }),
              },
              {
                  label: "Supprimer",
                  danger: true,
                  onClick: () =>
                      menu.type === "folder" ? deleteFolder(menu.id) : deleteFile(menu.id),
              },
          ]
        : [];

    const isEmpty = !loading && folders.length === 0 && files.length === 0;

    return (
        <>
            <div className="mt-10 sm:mt-12">
                {/* Toolbar */}
                <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
                    <Breadcrumb crumbs={breadcrumb} onNavigate={navigate} />
                    <button
                        onClick={() => setShowNewFolder(true)}
                        className="flex items-center gap-2 rounded-xl border border-hairline-strong bg-raised px-3 py-2 text-sm text-text-muted transition-colors hover:border-mauve/40 hover:text-mauve-text"
                    >
                        <svg
                            xmlns="http://www.w3.org/2000/svg"
                            className="h-4 w-4"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                            strokeWidth={1.5}
                        >
                            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                        </svg>
                        Nouveau dossier
                    </button>
                </div>

                {/* Séparateur */}
                <div
                    aria-hidden
                    className="mb-5 h-px bg-gradient-to-r from-hairline-strong to-transparent"
                />

                {/* Upload zone */}
                <div className="mb-6">
                    <UploadZone folderId={folderId} onUploaded={load} />
                </div>

                {/* Contenu */}
                {loading && (
                    <div className="flex flex-col gap-2">
                        {[...Array(4)].map((_, i) => (
                            <div key={i} className="skeleton h-12 rounded-xl" />
                        ))}
                    </div>
                )}

                {error && (
                    <p className="text-sm text-down">{error}</p>
                )}

                {!loading && !error && isEmpty && (
                    <div className="flex flex-col items-center gap-2 py-16 text-center text-text-muted">
                        <svg
                            xmlns="http://www.w3.org/2000/svg"
                            className="h-12 w-12 opacity-30"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                            strokeWidth={1}
                        >
                            <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                d="M2.25 12.75V12A2.25 2.25 0 014.5 9.75h15A2.25 2.25 0 0121.75 12v.75m-8.69-6.44l-2.12-2.12a1.5 1.5 0 00-1.061-.44H4.5A2.25 2.25 0 002.25 6v12a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9a2.25 2.25 0 00-2.25-2.25h-5.379a1.5 1.5 0 01-1.06-.44z"
                            />
                        </svg>
                        <p className="text-sm">Ce dossier est vide</p>
                        <p className="text-xs">Uploadez des fichiers ou créez un sous-dossier.</p>
                    </div>
                )}

                {!loading && !error && !isEmpty && (
                    <div className="flex flex-col gap-1.5">
                        {folders.map((folder) => (
                            <FolderItem
                                key={folder.id}
                                folder={folder}
                                onOpen={() => navigate(folder.id)}
                                onMenu={(e) => openMenu(e, "folder", folder.id, folder.name)}
                            />
                        ))}
                        {files.length > 0 && folders.length > 0 && (
                            <div className="my-2 h-px bg-hairline" />
                        )}
                        {files.map((file) => (
                            <FileItem
                                key={file.id}
                                file={file}
                                onMenu={(e) => openMenu(e, "file", file.id, file.name)}
                            />
                        ))}
                    </div>
                )}
            </div>

            {showNewFolder && (
                <NewFolderDialog onConfirm={createFolder} onClose={() => setShowNewFolder(false)} />
            )}

            {renameTarget && (
                <RenameDialog
                    initialName={renameTarget.name}
                    onConfirm={(name) => rename(renameTarget.type, renameTarget.id, name)}
                    onClose={() => setRenameTarget(null)}
                />
            )}

            {menu && (
                <ContextMenu
                    x={menu.x}
                    y={menu.y}
                    actions={menuActions}
                    onClose={() => setMenu(null)}
                />
            )}
        </>
    );
}
