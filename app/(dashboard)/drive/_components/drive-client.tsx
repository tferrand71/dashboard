"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Download, FolderOpen, FolderPlus, Pencil, Trash2 } from "lucide-react";
import { Dialog } from "../../_components/dialog";
import { EmptyState, ErrorBanner, Skeleton } from "../../_components/ui";
import { Breadcrumb } from "./breadcrumb";
import { ContextMenu, type MenuAction } from "./context-menu";
import { DriveHeaderRow, FileItem, FolderItem } from "./drive-item";
import { NewFolderDialog } from "./new-folder-dialog";
import { RenameDialog } from "./rename-dialog";
import { UploadZone } from "./upload-zone";

type FolderEntry = { id: string; name: string; createdAt: string; updatedAt: string };
type FileEntry = { id: string; name: string; size: number; mimeType: string; createdAt: string };
type Crumb = { id: string | null; name: string };
type Target = { type: "folder" | "file"; id: string; name: string };
type MenuState = Target & { x: number; y: number };

export function DriveClient() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const folderId = searchParams.get("folder") ?? null;

    const [folders, setFolders] = useState<FolderEntry[]>([]);
    const [files, setFiles] = useState<FileEntry[]>([]);
    const [breadcrumb, setBreadcrumb] = useState<Crumb[]>([{ id: null, name: "Drive" }]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [actionError, setActionError] = useState<string | null>(null);

    const [showNewFolder, setShowNewFolder] = useState(false);
    const [menu, setMenu] = useState<MenuState | null>(null);
    const [renameTarget, setRenameTarget] = useState<Target | null>(null);
    const [deleteTarget, setDeleteTarget] = useState<Target | null>(null);

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
            setBreadcrumb(
                folderId && data.breadcrumb
                    ? [{ id: null, name: "Drive" }, ...data.breadcrumb]
                    : [{ id: null, name: "Drive" }],
            );
        } catch {
            setError("Impossible de charger le contenu.");
        } finally {
            setLoading(false);
        }
    }, [folderId]);

    useEffect(() => {
        const t = setTimeout(load, 0);
        return () => clearTimeout(t);
    }, [load]);

    function navigate(id: string | null) {
        const params = new URLSearchParams(searchParams.toString());
        if (id) params.set("folder", id);
        else params.delete("folder");
        router.push(`/drive?${params.toString()}`);
    }

    async function createFolder(name: string) {
        setShowNewFolder(false);
        setActionError(null);
        const res = await fetch("/api/drive/folders", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ name, parentId: folderId }),
        });
        if (res.ok) load();
        else {
            const data = await res.json().catch(() => ({}));
            setActionError(data.error ?? "Erreur lors de la création du dossier.");
        }
    }

    async function remove(target: Target) {
        setDeleteTarget(null);
        setActionError(null);
        const url = target.type === "folder" ? `/api/drive/folders/${target.id}` : `/api/drive/files/${target.id}`;
        const res = await fetch(url, { method: "DELETE" });
        if (!res.ok) setActionError("Suppression impossible.");
        load();
    }

    async function rename(target: Target, name: string) {
        setRenameTarget(null);
        setActionError(null);
        const url = target.type === "folder" ? `/api/drive/folders/${target.id}` : `/api/drive/files/${target.id}`;
        const res = await fetch(url, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ name }),
        });
        if (res.ok) load();
        else {
            const data = await res.json().catch(() => ({}));
            setActionError(data.error ?? "Erreur lors du renommage.");
        }
    }

    function openMenu(e: React.MouseEvent, type: Target["type"], id: string, name: string) {
        setMenu({ x: e.clientX, y: e.clientY, type, id, name });
    }

    const menuActions: MenuAction[] = menu
        ? [
              menu.type === "folder"
                  ? { label: "Ouvrir", icon: FolderOpen, onClick: () => navigate(menu.id) }
                  : {
                        label: "Télécharger",
                        icon: Download,
                        onClick: () => {
                            window.location.href = `/api/drive/files/${menu.id}/download`;
                        },
                    },
              { label: "Renommer", icon: Pencil, onClick: () => setRenameTarget(menu) },
              { label: "Supprimer", icon: Trash2, danger: true, onClick: () => setDeleteTarget(menu) },
          ]
        : [];

    const isEmpty = !loading && folders.length === 0 && files.length === 0;
    const totalSize = files.reduce((sum, f) => sum + f.size, 0);

    return (
        <>
            <div className="mt-8 space-y-4">
                <UploadZone folderId={folderId} onUploaded={load} />

                {actionError && <ErrorBanner>{actionError}</ErrorBanner>}

                <section className="card overflow-hidden">
                    <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line px-3 py-2.5">
                        <Breadcrumb crumbs={breadcrumb} onNavigate={navigate} />
                        <div className="flex items-center gap-3">
                            {!loading && !isEmpty && (
                                <span className="tabular hidden text-xs text-fg-subtle sm:inline">
                                    {folders.length} dossier{folders.length > 1 ? "s" : ""} · {files.length} fichier
                                    {files.length > 1 ? "s" : ""}
                                    {totalSize > 0 && ` · ${(totalSize / 1024 / 1024).toFixed(1).replace(".", ",")} Mo`}
                                </span>
                            )}
                            <button type="button" onClick={() => setShowNewFolder(true)} className="btn btn-secondary h-7 px-2.5 text-xs">
                                <FolderPlus className="h-3.5 w-3.5" />
                                Nouveau dossier
                            </button>
                        </div>
                    </div>

                    {loading ? (
                        <div className="divide-y divide-line">
                            {[0, 1, 2, 3].map((i) => (
                                <div key={i} className="flex items-center gap-3 px-4 py-3">
                                    <Skeleton className="h-4 w-4" />
                                    <Skeleton className="h-3.5 w-48" />
                                </div>
                            ))}
                        </div>
                    ) : error ? (
                        <div className="p-4">
                            <ErrorBanner>{error}</ErrorBanner>
                        </div>
                    ) : isEmpty ? (
                        <EmptyState icon={FolderOpen} title="Ce dossier est vide">
                            Importe des fichiers ou crée un sous-dossier.
                        </EmptyState>
                    ) : (
                        <>
                            <DriveHeaderRow />
                            <div className="divide-y divide-line">
                                {folders.map((folder) => (
                                    <FolderItem
                                        key={folder.id}
                                        folder={folder}
                                        onOpen={() => navigate(folder.id)}
                                        onMenu={(e) => openMenu(e, "folder", folder.id, folder.name)}
                                    />
                                ))}
                                {files.map((file) => (
                                    <FileItem
                                        key={file.id}
                                        file={file}
                                        onMenu={(e) => openMenu(e, "file", file.id, file.name)}
                                    />
                                ))}
                            </div>
                        </>
                    )}
                </section>
            </div>

            {showNewFolder && <NewFolderDialog onConfirm={createFolder} onClose={() => setShowNewFolder(false)} />}

            {renameTarget && (
                <RenameDialog
                    initialName={renameTarget.name}
                    onConfirm={(name) => rename(renameTarget, name)}
                    onClose={() => setRenameTarget(null)}
                />
            )}

            {deleteTarget && (
                <Dialog
                    title={deleteTarget.type === "folder" ? "Supprimer le dossier ?" : "Supprimer le fichier ?"}
                    description={
                        <>
                            <span className="font-medium text-fg">{deleteTarget.name}</span>
                            {deleteTarget.type === "folder"
                                ? " et tout son contenu seront définitivement supprimés."
                                : " sera définitivement supprimé."}
                        </>
                    }
                    onClose={() => setDeleteTarget(null)}
                    footer={
                        <>
                            <button type="button" onClick={() => setDeleteTarget(null)} className="btn btn-secondary">
                                Annuler
                            </button>
                            <button type="button" onClick={() => remove(deleteTarget)} className="btn btn-danger">
                                <Trash2 className="h-3.5 w-3.5" />
                                Supprimer
                            </button>
                        </>
                    }
                >
                    <p className="text-[13px] text-fg-muted">Cette action est irréversible.</p>
                </Dialog>
            )}

            {menu && <ContextMenu x={menu.x} y={menu.y} actions={menuActions} onClose={() => setMenu(null)} />}
        </>
    );
}
