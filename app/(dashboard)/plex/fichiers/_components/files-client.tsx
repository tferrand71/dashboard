"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import {
    AlertTriangle,
    ArrowLeft,
    CheckCircle2,
    ChevronRight,
    File as FileIcon,
    Folder,
    FolderPlus,
    Loader2,
    Trash2,
    Upload,
    WifiOff,
    X,
} from "lucide-react";
import type { RemoteItem, RemoteRoot } from "@/lib/media";
import { formatBytes, timeAgo } from "@/lib/format";
import { Badge, EmptyState, ErrorBanner, Meter, Panel, Skeleton } from "../../../_components/ui";
import { Dialog } from "../../../_components/dialog";

/* ── Types ─────────────────────────────────────────────────── */

type Listing =
    | { kind: "roots"; roots: RemoteRoot[] }
    | { kind: "dir"; items: RemoteItem[]; free: number; total: number };

type UploadState = "queued" | "uploading" | "done" | "error" | "cancelled";
type Upload = { id: number; file: File; dest: string; size: number; sent: number; state: UploadState; error?: string };
type Picked = { file: File; rel: string };

type Reply = { ok: boolean; error?: string; offset?: number; status: number };

const ROOT_LABEL: Record<string, string> = { film: "Films", serie: "Séries" };
const MB = 1024 * 1024;

/* ── Appels API ────────────────────────────────────────────── */

async function post(body: Record<string, unknown>): Promise<Reply> {
    try {
        const res = await fetch("/api/plex/files", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(body),
        });
        const json = (await res.json().catch(() => ({}))) as { ok?: boolean; error?: string; offset?: number };
        return { ok: res.ok && json.ok !== false, error: json.error, offset: json.offset, status: res.status };
    } catch {
        return { ok: false, error: "Connexion perdue", status: 0 };
    }
}

/** Envoie un morceau en PUT (XMLHttpRequest : seul moyen d'avoir la progression de l'envoi). */
function putChunk(path: string, offset: number, blob: Blob, onProgress: (loaded: number) => void, signal: AbortSignal): Promise<Reply> {
    return new Promise((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.open("PUT", `/api/plex/files/chunk?path=${encodeURIComponent(path)}&offset=${offset}&length=${blob.size}`);
        xhr.upload.onprogress = (e) => onProgress(e.loaded);
        xhr.onload = () => {
            let json: { ok?: boolean; error?: string; offset?: number } = {};
            try {
                json = JSON.parse(xhr.responseText);
            } catch {}
            const error = xhr.status === 401 ? "Session expirée, reconnecte-toi" : json.error;
            resolve({ ok: xhr.status === 200 && json.ok === true, error, offset: json.offset, status: xhr.status });
        };
        xhr.onerror = () => reject(new Error("Connexion perdue"));
        xhr.ontimeout = () => reject(new Error("Délai dépassé"));
        const onAbort = () => {
            xhr.abort();
            reject(new DOMException("annulé", "AbortError"));
        };
        if (signal.aborted) return onAbort();
        signal.addEventListener("abort", onAbort, { once: true });
        xhr.send(blob);
    });
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
const isAbort = (e: unknown) => e instanceof DOMException && e.name === "AbortError";

/* ── Glisser-déposer : fichiers et dossiers ────────────────── */

async function readAll(reader: FileSystemDirectoryReader): Promise<FileSystemEntry[]> {
    const all: FileSystemEntry[] = [];
    for (;;) {
        const batch = await new Promise<FileSystemEntry[]>((res, rej) => reader.readEntries(res, rej));
        if (batch.length === 0) return all;
        all.push(...batch);
    }
}

async function walk(entry: FileSystemEntry, prefix: string, out: Picked[]) {
    if (entry.isFile) {
        const file = await new Promise<File>((res, rej) => (entry as FileSystemFileEntry).file(res, rej));
        out.push({ file, rel: prefix + entry.name });
    } else if (entry.isDirectory) {
        for (const child of await readAll((entry as FileSystemDirectoryEntry).createReader())) {
            await walk(child, `${prefix}${entry.name}/`, out);
        }
    }
}

/** Les entrées doivent être lues de façon synchrone dans l'évènement : d'où ce premier map avant tout await. */
async function pickFromDrop(dt: DataTransfer): Promise<Picked[]> {
    const entries = Array.from(dt.items)
        .map((i) => (i.kind === "file" ? i.webkitGetAsEntry() : null))
        .filter((e): e is FileSystemEntry => e !== null);
    if (entries.length === 0) return Array.from(dt.files).map((f) => ({ file: f, rel: f.name }));
    const out: Picked[] = [];
    for (const e of entries) await walk(e, "", out);
    return out;
}

const IGNORED = new Set([".DS_Store", "Thumbs.db", "desktop.ini"]);
const keepPicked = (p: Picked) => !p.rel.split("/").some((part) => part.startsWith(".") || IGNORED.has(part));

/* ── Composant principal ───────────────────────────────────── */

export function FilesClient() {
    const [path, setPath] = useState("");
    const [listing, setListing] = useState<Listing | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);
    const [dragging, setDragging] = useState(false);
    const [toDelete, setToDelete] = useState<RemoteItem | null>(null);
    const [deleting, setDeleting] = useState(false);
    const [deleteError, setDeleteError] = useState<string | null>(null);
    const [mkdirOpen, setMkdirOpen] = useState(false);
    const [folderName, setFolderName] = useState("");
    const [mkdirError, setMkdirError] = useState<string | null>(null);
    const [uploads, setUploads] = useState<Upload[]>([]);

    const uploadsRef = useRef<Upload[]>([]);
    const controllers = useRef(new Map<number, AbortController>());
    const running = useRef(false);
    const nextId = useRef(1);
    const pathRef = useRef(path);
    useEffect(() => {
        pathRef.current = path;
    });

    /* Liste du dossier courant */
    const load = useCallback(async (target: string, silent = false) => {
        if (!silent) setLoading(true);
        try {
            const res = await fetch(`/api/plex/files${target ? `?path=${encodeURIComponent(target)}` : ""}`, { cache: "no-store" });
            const json = (await res.json()) as {
                ok?: boolean;
                configured?: boolean;
                error?: string;
                roots?: RemoteRoot[];
                items?: RemoteItem[];
                free?: number;
                total?: number;
            };
            if (json.configured === false) throw new Error("L'accès aux fichiers n'est pas configuré sur ce déploiement.");
            if (!res.ok || json.ok === false) throw new Error(json.error ?? "Serveur Plex injoignable");
            setListing(
                target
                    ? { kind: "dir", items: json.items ?? [], free: json.free ?? 0, total: json.total ?? 0 }
                    : { kind: "roots", roots: json.roots ?? [] },
            );
            setError(null);
        } catch (e) {
            setError(e instanceof Error ? e.message : "Serveur Plex injoignable");
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        const t = setTimeout(() => void load(path), 0);
        return () => clearTimeout(t);
    }, [path, load]);

    /* Avertit avant de quitter la page pendant un envoi */
    const busy = uploads.some((u) => u.state === "queued" || u.state === "uploading");
    useEffect(() => {
        if (!busy) return;
        const h = (e: BeforeUnloadEvent) => e.preventDefault();
        window.addEventListener("beforeunload", h);
        return () => window.removeEventListener("beforeunload", h);
    }, [busy]);

    /* ── File d'envoi ── */
    const patch = useCallback((id: number, change: Partial<Upload>) => {
        uploadsRef.current = uploadsRef.current.map((u) => (u.id === id ? { ...u, ...change } : u));
        setUploads(uploadsRef.current);
    }, []);

    const sendFile = useCallback(
        async (u: Upload) => {
            const ctrl = new AbortController();
            controllers.current.set(u.id, ctrl);
            patch(u.id, { state: "uploading", sent: 0, error: undefined });
            try {
                const begin = await post({ action: "begin", path: u.dest, size: u.size, resume: false });
                if (!begin.ok) throw new Error(begin.error ?? "Refusé par le serveur");
                let offset = begin.offset ?? 0;
                let chunk = 8 * MB;

                while (offset < u.size) {
                    const startedAt = performance.now();
                    let len = Math.min(chunk, u.size - offset);
                    let sentChunk = false;

                    for (let attempt = 0; !sentChunk; attempt++) {
                        try {
                            const base = offset;
                            const res = await putChunk(u.dest, base, u.file.slice(base, base + len), (l) => patch(u.id, { sent: base + l }), ctrl.signal);
                            if (res.ok) {
                                offset = res.offset ?? base + len;
                                sentChunk = true;
                            } else if (res.status === 409 && typeof res.offset === "number") {
                                offset = res.offset; // le serveur a déjà reçu plus (ou moins) : on se recale
                                sentChunk = true;
                            } else {
                                throw new Error(res.error ?? `Erreur ${res.status}`);
                            }
                        } catch (e) {
                            if (isAbort(e) || attempt >= 4) throw e;
                            await sleep(1500 * 2 ** attempt);
                            const resume = await post({ action: "begin", path: u.dest, size: u.size, resume: true });
                            if (resume.ok && typeof resume.offset === "number") offset = resume.offset;
                            if (offset >= u.size) sentChunk = true;
                            len = Math.min(len, u.size - offset);
                        }
                    }
                    patch(u.id, { sent: offset });
                    // Taille du prochain morceau : environ 15 s d'envoi, pour rester sous le délai de Traefik (60 s).
                    const seconds = Math.max(0.3, (performance.now() - startedAt) / 1000);
                    chunk = Math.min(32 * MB, Math.max(4 * MB, Math.round((len / seconds) * 15)));
                }

                const end = await post({ action: "end", path: u.dest, size: u.size });
                if (!end.ok) throw new Error(end.error ?? "Vérification finale refusée");
                patch(u.id, { state: "done", sent: u.size });
            } catch (e) {
                if (isAbort(e)) {
                    await post({ action: "abort", path: u.dest });
                    patch(u.id, { state: "cancelled" });
                } else {
                    patch(u.id, { state: "error", error: e instanceof Error ? e.message : "Échec de l'envoi" });
                }
            } finally {
                controllers.current.delete(u.id);
            }
        },
        [patch],
    );

    const runQueue = useCallback(async () => {
        if (running.current) return;
        running.current = true;
        const touched = new Set<string>();
        try {
            for (;;) {
                const next = uploadsRef.current.find((u) => u.state === "queued");
                if (!next) break;
                await sendFile(next);
                if (uploadsRef.current.find((u) => u.id === next.id)?.state === "done") touched.add(next.dest.split("/")[0]);
            }
        } finally {
            running.current = false;
            // Une seule demande de scan Plex par lot, puis on rafraîchit la liste.
            for (const root of touched) await post({ action: "refresh", root });
            if (touched.size > 0) void load(pathRef.current, true);
        }
    }, [sendFile, load]);

    const enqueue = useCallback(
        (picked: Picked[]) => {
            const dir = pathRef.current;
            const items = picked.filter(keepPicked).map<Upload>((p) => ({
                id: nextId.current++,
                file: p.file,
                dest: `${dir}/${p.rel}`,
                size: p.file.size,
                sent: 0,
                state: "queued",
            }));
            if (items.length === 0) return;
            uploadsRef.current = [...uploadsRef.current, ...items];
            setUploads(uploadsRef.current);
            void runQueue();
        },
        [runQueue],
    );

    const cancel = (id: number) => {
        const ctrl = controllers.current.get(id);
        if (ctrl) ctrl.abort();
        else patch(id, { state: "cancelled" });
    };

    const clearFinished = () => {
        uploadsRef.current = uploadsRef.current.filter((u) => u.state === "queued" || u.state === "uploading");
        setUploads(uploadsRef.current);
    };

    /* ── Actions sur le serveur ── */
    const canUpload = listing?.kind === "dir";

    async function confirmDelete() {
        if (!toDelete) return;
        setDeleting(true);
        setDeleteError(null);
        const r = await post({ action: "delete", path: `${path}/${toDelete.name}` });
        setDeleting(false);
        if (!r.ok) return setDeleteError(r.error ?? "Suppression refusée");
        setToDelete(null);
        void load(path, true);
    }

    async function createFolder() {
        const name = folderName.trim();
        if (!name) return;
        setMkdirError(null);
        const r = await post({ action: "mkdir", path: `${path}/${name}` });
        if (!r.ok) return setMkdirError(r.error ?? "Création refusée");
        setMkdirOpen(false);
        setFolderName("");
        void load(path, true);
    }

    function onDrop(e: React.DragEvent) {
        e.preventDefault();
        setDragging(false);
        if (!canUpload) return;
        void pickFromDrop(e.dataTransfer).then(enqueue);
    }

    /* ── Affichage ── */
    const crumbs = useMemo(() => {
        const parts = path.split("/").filter(Boolean);
        return parts.map((p, i) => ({ label: i === 0 ? (ROOT_LABEL[p] ?? p) : p, path: parts.slice(0, i + 1).join("/") }));
    }, [path]);

    const parent = path.includes("/") ? path.slice(0, path.lastIndexOf("/")) : "";
    const usedPercent = listing?.kind === "dir" && listing.total > 0 ? ((listing.total - listing.free) / listing.total) * 100 : 0;

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between gap-3">
                <Link href="/plex" className="btn btn-ghost -ml-2">
                    <ArrowLeft className="h-3.5 w-3.5" />
                    Retour à Plex
                </Link>
                {listing?.kind === "dir" && (
                    <div className="flex items-center gap-2">
                        <Badge tone={usedPercent >= 90 ? "down" : usedPercent >= 75 ? "warn" : "ok"} dot>
                            {formatBytes(listing.free)} libres
                        </Badge>
                    </div>
                )}
            </div>

            <Panel
                title={crumbs.length === 0 ? "Bibliothèques du serveur Plex" : crumbs[crumbs.length - 1].label}
                description={
                    <span className="flex flex-wrap items-center gap-1">
                        <button type="button" className="hover:text-fg" onClick={() => setPath("")}>
                            Serveur Plex
                        </button>
                        {crumbs.map((c) => (
                            <span key={c.path} className="flex items-center gap-1">
                                <ChevronRight className="h-3 w-3" />
                                <button type="button" className="hover:text-fg" onClick={() => setPath(c.path)}>
                                    {c.label}
                                </button>
                            </span>
                        ))}
                    </span>
                }
                actions={
                    canUpload ? (
                        <>
                            <button type="button" className="btn btn-secondary" onClick={() => setMkdirOpen(true)}>
                                <FolderPlus className="h-3.5 w-3.5" />
                                Nouveau dossier
                            </button>
                            <label className="btn btn-primary cursor-pointer">
                                <Upload className="h-3.5 w-3.5" />
                                Envoyer
                                <input
                                    type="file"
                                    multiple
                                    className="hidden"
                                    onChange={(e) => {
                                        enqueue(Array.from(e.target.files ?? []).map((f) => ({ file: f, rel: f.name })));
                                        e.target.value = "";
                                    }}
                                />
                            </label>
                        </>
                    ) : undefined
                }
            >
                <div
                    className={`relative ${dragging && canUpload ? "bg-accent/10 outline-2 -outline-offset-2 outline-dashed outline-accent/60" : ""}`}
                    onDragOver={(e) => {
                        if (e.dataTransfer.types.includes("Files")) {
                            e.preventDefault();
                            setDragging(true);
                        }
                    }}
                    onDragLeave={(e) => {
                        if (!e.currentTarget.contains(e.relatedTarget as Node)) setDragging(false);
                    }}
                    onDrop={onDrop}
                >
                    {loading && !listing && (
                        <div className="space-y-2 px-4 py-3">
                            <Skeleton className="h-10 w-full" />
                            <Skeleton className="h-10 w-full" />
                            <Skeleton className="h-10 w-full" />
                        </div>
                    )}

                    {error && (
                        <div className="p-4">
                            <EmptyState icon={WifiOff} title="Serveur Plex injoignable">
                                {error}. Il est peut-être éteint : tu peux le redémarrer depuis l&rsquo;onglet Plex.
                            </EmptyState>
                        </div>
                    )}

                    {!error && listing?.kind === "roots" &&
                        listing.roots.map((r) => (
                            <button
                                key={r.name}
                                type="button"
                                onClick={() => setPath(r.name)}
                                className="flex w-full items-center gap-3 border-b border-line px-4 py-3.5 text-left last:border-b-0 hover:bg-elevated/60"
                            >
                                <span className="flex h-[34px] w-[34px] items-center justify-center rounded-lg bg-accent/12 text-accent-fg">
                                    <Folder className="h-4 w-4" />
                                </span>
                                <span className="flex-1 text-[13.5px] font-medium">{ROOT_LABEL[r.name] ?? r.name}</span>
                                {r.free !== null && <span className="text-xs text-fg-subtle">{formatBytes(r.free)} libres</span>}
                                <ChevronRight className="h-4 w-4 text-fg-subtle" />
                            </button>
                        ))}

                    {!error && listing?.kind === "dir" && (
                        <>
                            <div className="px-4 py-2.5">
                                <Meter percent={usedPercent} tone={usedPercent >= 90 ? "down" : usedPercent >= 75 ? "warn" : "ok"} />
                            </div>
                            {path.includes("/") && (
                                <button
                                    type="button"
                                    onClick={() => setPath(parent)}
                                    className="flex w-full items-center gap-3 border-t border-line px-4 py-2.5 text-left text-[13px] text-fg-muted hover:bg-elevated/60"
                                >
                                    <ArrowLeft className="h-4 w-4" /> Dossier parent
                                </button>
                            )}
                            {listing.items.length === 0 && (
                                <EmptyState icon={Upload} title="Dossier vide">
                                    Glisse des fichiers ou des dossiers ici pour les envoyer sur le serveur Plex.
                                </EmptyState>
                            )}
                            {listing.items.map((it) => (
                                <div key={it.name} className="flex items-center gap-3 border-t border-line px-4 py-2.5">
                                    <span className="flex h-[30px] w-[30px] shrink-0 items-center justify-center rounded-md bg-elevated text-fg-muted">
                                        {it.dir ? <Folder className="h-4 w-4" /> : <FileIcon className="h-4 w-4" />}
                                    </span>
                                    {it.dir ? (
                                        <button type="button" onClick={() => setPath(`${path}/${it.name}`)} className="min-w-0 flex-1 truncate text-left text-[13.5px] hover:text-accent-fg">
                                            {it.name}
                                        </button>
                                    ) : (
                                        <span className="min-w-0 flex-1 truncate text-[13.5px]">{it.name}</span>
                                    )}
                                    <span className="hidden w-20 shrink-0 text-right font-mono text-xs tabular text-fg-subtle sm:block">
                                        {it.size === null ? "—" : formatBytes(it.size)}
                                    </span>
                                    <span className="hidden w-24 shrink-0 text-right text-xs text-fg-subtle md:block">
                                        {timeAgo(new Date(it.mtime * 1000))}
                                    </span>
                                    <button
                                        type="button"
                                        className="btn btn-ghost w-8 shrink-0 px-0 hover:text-down"
                                        aria-label={`Supprimer ${it.name}`}
                                        onClick={() => {
                                            setDeleteError(null);
                                            setToDelete(it);
                                        }}
                                    >
                                        <Trash2 className="h-4 w-4" />
                                    </button>
                                </div>
                            ))}
                        </>
                    )}

                    {dragging && canUpload && (
                        <div className="pointer-events-none absolute inset-0 flex items-center justify-center bg-surface/70 text-sm font-medium text-accent-fg">
                            Dépose pour envoyer dans « {crumbs[crumbs.length - 1]?.label} »
                        </div>
                    )}
                    {!canUpload && !error && (
                        <p className="border-t border-line px-4 py-3 text-xs text-fg-subtle">
                            Ouvre d&rsquo;abord Films ou Séries pour pouvoir y glisser des fichiers.
                        </p>
                    )}
                </div>
            </Panel>

            {uploads.length > 0 && (
                <Panel
                    title="Envois"
                    description={busy ? "Ne ferme pas cette page tant que c'est en cours" : "Terminé"}
                    actions={
                        !busy ? (
                            <button type="button" className="btn btn-ghost" onClick={clearFinished}>
                                Effacer la liste
                            </button>
                        ) : undefined
                    }
                >
                    {uploads.map((u) => {
                        const percent = u.size > 0 ? Math.round((u.sent / u.size) * 100) : u.state === "done" ? 100 : 0;
                        return (
                            <div key={u.id} className="flex items-center gap-3 border-b border-line px-4 py-3 last:border-b-0">
                                <span className="flex h-[30px] w-[30px] shrink-0 items-center justify-center">
                                    {u.state === "uploading" && <Loader2 className="h-4 w-4 animate-spin text-accent-fg" />}
                                    {u.state === "queued" && <Upload className="h-4 w-4 text-fg-subtle" />}
                                    {u.state === "done" && <CheckCircle2 className="h-4 w-4 text-ok" />}
                                    {u.state === "error" && <AlertTriangle className="h-4 w-4 text-down" />}
                                    {u.state === "cancelled" && <X className="h-4 w-4 text-fg-subtle" />}
                                </span>
                                <div className="min-w-0 flex-1">
                                    <p className="truncate text-[13.5px] font-medium">{u.dest.split("/").slice(1).join("/")}</p>
                                    {u.state === "error" || u.state === "cancelled" ? (
                                        <p className={`truncate text-xs ${u.state === "error" ? "text-down" : "text-fg-subtle"}`}>
                                            {u.state === "error" ? u.error : "Annulé"}
                                        </p>
                                    ) : (
                                        <div className="mt-1.5 flex items-center gap-2">
                                            <Meter percent={percent} tone={u.state === "done" ? "ok" : "info"} />
                                            <span className="w-24 shrink-0 text-right text-[11px] tabular text-fg-subtle">
                                                {u.state === "queued" ? "En attente" : `${percent}% · ${formatBytes(u.size)}`}
                                            </span>
                                        </div>
                                    )}
                                </div>
                                {(u.state === "queued" || u.state === "uploading") && (
                                    <button type="button" className="btn btn-ghost w-8 shrink-0 px-0" aria-label="Annuler" onClick={() => cancel(u.id)}>
                                        <X className="h-4 w-4" />
                                    </button>
                                )}
                            </div>
                        );
                    })}
                </Panel>
            )}

            {toDelete && (
                <Dialog
                    title="Supprimer définitivement ?"
                    description="Cette action est irréversible."
                    onClose={() => !deleting && setToDelete(null)}
                    footer={
                        <>
                            <button type="button" className="btn btn-ghost" disabled={deleting} onClick={() => setToDelete(null)}>
                                Annuler
                            </button>
                            <button type="button" className="btn btn-danger" disabled={deleting} onClick={confirmDelete}>
                                {deleting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
                                Supprimer définitivement
                            </button>
                        </>
                    }
                >
                    <div className="space-y-3 text-[13px] text-fg-muted">
                        <p className="break-words rounded-md border border-line bg-elevated px-3 py-2 font-medium text-fg">
                            {toDelete.dir ? "Dossier" : "Fichier"} : {toDelete.name}
                            {toDelete.size !== null && <span className="ml-2 font-normal text-fg-subtle">({formatBytes(toDelete.size)})</span>}
                        </p>
                        <p>
                            {toDelete.dir ? "Le dossier et tout son contenu seront effacés" : "Le fichier sera effacé"} du disque du serveur Plex, puis
                            disparaîtront de la bibliothèque.
                        </p>
                        {deleteError && <ErrorBanner>{deleteError}</ErrorBanner>}
                    </div>
                </Dialog>
            )}

            {mkdirOpen && (
                <Dialog
                    title="Nouveau dossier"
                    onClose={() => setMkdirOpen(false)}
                    footer={
                        <>
                            <button type="button" className="btn btn-ghost" onClick={() => setMkdirOpen(false)}>
                                Annuler
                            </button>
                            <button type="button" className="btn btn-primary" disabled={!folderName.trim()} onClick={createFolder}>
                                Créer
                            </button>
                        </>
                    }
                >
                    <div className="space-y-3">
                        <input
                            autoFocus
                            className="input"
                            placeholder="Nom du dossier"
                            value={folderName}
                            onChange={(e) => setFolderName(e.target.value)}
                            onKeyDown={(e) => e.key === "Enter" && void createFolder()}
                        />
                        {mkdirError && <ErrorBanner>{mkdirError}</ErrorBanner>}
                    </div>
                </Dialog>
            )}
        </div>
    );
}
