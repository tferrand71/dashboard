"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, CheckCircle2, Home, KeyRound, Loader2, Mail, ShieldCheck, SlidersHorizontal, Trash2, UserPlus, Users } from "lucide-react";
import type { Library, Member } from "@/lib/plexusers";
import { Badge, EmptyState, ErrorBanner, Panel, Skeleton } from "../../../_components/ui";
import { Dialog } from "../../../_components/dialog";

type ListResponse =
    | { ok: true; members: Member[]; libraries: Library[] }
    | { ok: false; configured?: false; error?: string };
type ActionResponse = { ok: true; message: string } | { ok: false; error: string };

type DialogState =
    | { kind: "add" }
    | { kind: "libs"; member: Member }
    | { kind: "remove"; member: Member }
    | null;

type Notice = { tone: "ok" | "error"; text: string };

const KIND_LABEL: Record<Member["kind"], string> = {
    admin: "Administrateur",
    home: "Profil du Home",
    friend: "Invité Plex",
};

function initials(name: string): string {
    return (
        name
            .split(/\s+/)
            .map((p) => p[0])
            .join("")
            .slice(0, 2)
            .toUpperCase() || "?"
    );
}

function LibraryChecks({
    libraries,
    selected,
    onChange,
}: {
    libraries: Library[];
    selected: Set<string>;
    onChange: (next: Set<string>) => void;
}) {
    return (
        <fieldset className="space-y-2">
            <legend className="mb-1 text-xs font-medium text-fg-muted">Bibliothèques accessibles</legend>
            {libraries.map((l) => (
                <label
                    key={l.id}
                    className="flex cursor-pointer items-center gap-2.5 rounded-md border border-line bg-elevated/50 px-3 py-2 text-[13px] hover:border-accent/40"
                >
                    <input
                        type="checkbox"
                        className="h-4 w-4 accent-[var(--color-accent)]"
                        checked={selected.has(l.id)}
                        onChange={(e) => {
                            const next = new Set(selected);
                            if (e.target.checked) next.add(l.id);
                            else next.delete(l.id);
                            onChange(next);
                        }}
                    />
                    {l.title}
                </label>
            ))}
        </fieldset>
    );
}

export function UsersClient() {
    const [data, setData] = useState<ListResponse | null>(null);
    const [dialog, setDialog] = useState<DialogState>(null);
    const [busy, setBusy] = useState(false);
    const [dialogError, setDialogError] = useState<string | null>(null);
    const [notice, setNotice] = useState<Notice | null>(null);

    // Formulaire d'ajout / de modification
    const [mode, setMode] = useState<"friend" | "home">("friend");
    const [value, setValue] = useState("");
    const [selected, setSelected] = useState<Set<string>>(new Set());

    const load = useCallback(async () => {
        try {
            const res = await fetch("/api/plex/members", { cache: "no-store" });
            setData((await res.json()) as ListResponse);
        } catch {
            setData({ ok: false, error: "Le dashboard n'a pas pu joindre l'API." });
        }
    }, []);

    useEffect(() => {
        const t = setTimeout(() => void load(), 0);
        return () => clearTimeout(t);
    }, [load]);

    useEffect(() => {
        if (!notice) return;
        const t = setTimeout(() => setNotice(null), 9_000);
        return () => clearTimeout(t);
    }, [notice]);

    const libraries = data?.ok ? data.libraries : [];
    const members = data?.ok ? data.members : [];
    const titleOf = (id: string) => libraries.find((l) => l.id === id)?.title ?? "?";

    function open(next: DialogState) {
        setDialogError(null);
        setValue("");
        setMode("friend");
        if (next?.kind === "libs") setSelected(new Set(next.member.libraryIds));
        else setSelected(new Set(libraries.map((l) => l.id))); // par défaut : tout cocher
        setDialog(next);
    }

    async function send(body: Record<string, unknown>) {
        setBusy(true);
        setDialogError(null);
        let result: ActionResponse;
        try {
            const res = await fetch("/api/plex/members", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(body),
            });
            result = (await res.json()) as ActionResponse;
        } catch {
            result = { ok: false, error: "Le dashboard n'a pas pu joindre l'API." };
        }
        setBusy(false);
        if (!result.ok) return setDialogError(result.error);
        setDialog(null);
        setNotice({ tone: "ok", text: result.message });
        void load();
    }

    const chosen = [...selected];

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between gap-3">
                <Link href="/plex" className="btn btn-ghost -ml-2">
                    <ArrowLeft className="h-3.5 w-3.5" />
                    Retour à Plex
                </Link>
                {data?.ok && (
                    <button type="button" className="btn btn-primary" onClick={() => open({ kind: "add" })}>
                        <UserPlus className="h-3.5 w-3.5" />
                        Ajouter un utilisateur
                    </button>
                )}
            </div>

            {notice && (
                <p
                    role="status"
                    className={`flex items-start gap-2 rounded-md border px-3 py-2 text-[13px] ${
                        notice.tone === "ok" ? "border-ok/30 bg-ok/10 text-ok" : "border-down/25 bg-down/10 text-down"
                    }`}
                >
                    <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
                    {notice.text}
                </p>
            )}

            <Panel title="Utilisateurs du serveur" description="Administrateur, profils du Plex Home et amis invités">
                {!data && (
                    <div className="space-y-2 px-4 py-3">
                        <Skeleton className="h-12 w-full" />
                        <Skeleton className="h-12 w-full" />
                        <Skeleton className="h-12 w-full" />
                    </div>
                )}

                {data && !data.ok && (
                    <div className="p-4">
                        <EmptyState icon={Users} title="Liste indisponible">
                            {data.configured === false ? "Plex n'est pas configuré sur ce déploiement." : (data.error ?? "plex.tv injoignable.")}
                        </EmptyState>
                    </div>
                )}

                {members.map((m) => (
                    <div key={m.id} className="flex flex-wrap items-center gap-x-3.5 gap-y-2 border-b border-line px-4 py-3 last:border-b-0">
                        <span className="flex h-[34px] w-[34px] shrink-0 items-center justify-center rounded-full bg-accent/12 text-[12px] font-semibold text-accent-fg">
                            {initials(m.name)}
                        </span>
                        <div className="min-w-0 flex-1">
                            <div className="flex flex-wrap items-center gap-2">
                                <p className="truncate text-[13.5px] font-medium">{m.name}</p>
                                <Badge tone={m.kind === "admin" ? "info" : "neutral"}>
                                    {m.kind === "admin" ? (
                                        <ShieldCheck className="h-[11px] w-[11px]" />
                                    ) : m.kind === "home" ? (
                                        <Home className="h-[11px] w-[11px]" />
                                    ) : (
                                        <Mail className="h-[11px] w-[11px]" />
                                    )}
                                    {KIND_LABEL[m.kind]}
                                </Badge>
                                {m.protectedByPin && (
                                    <Badge tone="neutral">
                                        <KeyRound className="h-[11px] w-[11px]" />
                                        Code PIN
                                    </Badge>
                                )}
                            </div>
                            <div className="mt-1 flex flex-wrap gap-1.5">
                                {m.kind === "admin" ? (
                                    <span className="text-xs text-fg-subtle">Accès complet</span>
                                ) : m.libraryIds.length === 0 ? (
                                    <Badge tone="warn">Aucun accès</Badge>
                                ) : (
                                    m.libraryIds.map((id) => (
                                        <Badge key={id} tone="ok">
                                            {titleOf(id)}
                                        </Badge>
                                    ))
                                )}
                            </div>
                        </div>
                        {m.kind !== "admin" && (
                            <div className="flex shrink-0 gap-1">
                                <button
                                    type="button"
                                    className="btn btn-ghost w-8 px-0"
                                    aria-label={`Modifier les accès de ${m.name}`}
                                    onClick={() => open({ kind: "libs", member: m })}
                                >
                                    <SlidersHorizontal className="h-4 w-4" />
                                </button>
                                <button
                                    type="button"
                                    className="btn btn-ghost w-8 px-0 hover:text-down"
                                    aria-label={`Supprimer ${m.name}`}
                                    onClick={() => open({ kind: "remove", member: m })}
                                >
                                    <Trash2 className="h-4 w-4" />
                                </button>
                            </div>
                        )}
                    </div>
                ))}
            </Panel>

            {dialog?.kind === "add" && (
                <Dialog
                    title="Ajouter un utilisateur"
                    size="md"
                    onClose={() => !busy && setDialog(null)}
                    footer={
                        <>
                            <button type="button" className="btn btn-ghost" disabled={busy} onClick={() => setDialog(null)}>
                                Annuler
                            </button>
                            <button
                                type="button"
                                className="btn btn-primary"
                                disabled={busy || !value.trim() || chosen.length === 0}
                                onClick={() =>
                                    send(
                                        mode === "friend"
                                            ? { action: "invite", identifier: value, libraryIds: chosen }
                                            : { action: "createHome", name: value, libraryIds: chosen },
                                    )
                                }
                            >
                                {busy && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                                {mode === "friend" ? "Envoyer l'invitation" : "Créer le profil"}
                            </button>
                        </>
                    }
                >
                    <div className="space-y-4">
                        <div className="grid grid-cols-2 gap-1 rounded-md border border-line bg-canvas/50 p-1" role="tablist">
                            {(
                                [
                                    ["friend", "Invité (compte Plex)", Mail],
                                    ["home", "Profil du Home", Home],
                                ] as const
                            ).map(([key, label, Icon]) => (
                                <button
                                    key={key}
                                    type="button"
                                    role="tab"
                                    aria-selected={mode === key}
                                    onClick={() => {
                                        setMode(key);
                                        setValue("");
                                        setDialogError(null);
                                    }}
                                    className={`flex items-center justify-center gap-1.5 rounded px-2 py-1.5 text-[12.5px] font-medium transition-colors ${
                                        mode === key ? "bg-accent text-white" : "text-fg-muted hover:text-fg"
                                    }`}
                                >
                                    <Icon className="h-3.5 w-3.5" />
                                    {label}
                                </button>
                            ))}
                        </div>

                        <div className="space-y-1.5">
                            <label htmlFor="plex-user-value" className="text-xs font-medium text-fg-muted">
                                {mode === "friend" ? "Adresse e-mail ou pseudo Plex" : "Nom du profil"}
                            </label>
                            <input
                                id="plex-user-value"
                                autoFocus
                                className="input"
                                placeholder={mode === "friend" ? "ami@exemple.fr" : "Prénom"}
                                value={value}
                                maxLength={mode === "friend" ? 254 : 30}
                                onChange={(e) => setValue(e.target.value)}
                            />
                            <p className="text-xs text-fg-subtle">
                                {mode === "friend"
                                    ? "Plex enverra un e-mail d'invitation à cette personne, qui devra l'accepter avec son propre compte."
                                    : "Pour quelqu'un sans compte Plex : le profil apparaît dans « Qui regarde ? » sur les appareils de ton foyer."}
                            </p>
                        </div>

                        <LibraryChecks libraries={libraries} selected={selected} onChange={setSelected} />
                        {dialogError && <ErrorBanner>{dialogError}</ErrorBanner>}
                    </div>
                </Dialog>
            )}

            {dialog?.kind === "libs" && (
                <Dialog
                    title={`Accès de ${dialog.member.name}`}
                    description="Choisis les bibliothèques que cette personne peut voir."
                    onClose={() => !busy && setDialog(null)}
                    footer={
                        <>
                            <button type="button" className="btn btn-ghost" disabled={busy} onClick={() => setDialog(null)}>
                                Annuler
                            </button>
                            <button
                                type="button"
                                className={`btn ${chosen.length === 0 ? "btn-danger" : "btn-primary"}`}
                                disabled={busy}
                                onClick={() => send({ action: "setLibraries", userId: dialog.member.id, libraryIds: chosen })}
                            >
                                {busy && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                                {chosen.length === 0 ? "Retirer tout accès" : "Enregistrer"}
                            </button>
                        </>
                    }
                >
                    <div className="space-y-3">
                        <LibraryChecks libraries={libraries} selected={selected} onChange={setSelected} />
                        {chosen.length === 0 && (
                            <p className="text-xs text-warn">
                                Sans aucune bibliothèque, {dialog.member.name} n&rsquo;aura plus accès au serveur (sans être supprimé·e).
                            </p>
                        )}
                        {dialogError && <ErrorBanner>{dialogError}</ErrorBanner>}
                    </div>
                </Dialog>
            )}

            {dialog?.kind === "remove" && (
                <Dialog
                    title={`Supprimer ${dialog.member.name} ?`}
                    description="Cette action est irréversible."
                    onClose={() => !busy && setDialog(null)}
                    footer={
                        <>
                            <button type="button" className="btn btn-ghost" disabled={busy} onClick={() => setDialog(null)}>
                                Annuler
                            </button>
                            <button
                                type="button"
                                className="btn btn-danger"
                                disabled={busy}
                                onClick={() => send({ action: "remove", userId: dialog.member.id })}
                            >
                                {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
                                Supprimer définitivement
                            </button>
                        </>
                    }
                >
                    <div className="space-y-3 text-[13px] text-fg-muted">
                        {dialog.member.kind === "home" ? (
                            <p>
                                Le profil sera supprimé du Plex Home avec <b className="text-fg">son historique de visionnage, ses notes et sa liste
                                « à suivre »</b>. Ces données ne peuvent pas être récupérées.
                            </p>
                        ) : (
                            <p>
                                {dialog.member.name} perdra l&rsquo;accès à ton serveur et sera retiré·e de ta liste d&rsquo;amis Plex. Il faudra
                                refaire une invitation pour lui redonner accès.
                            </p>
                        )}
                        {dialogError && <ErrorBanner>{dialogError}</ErrorBanner>}
                    </div>
                </Dialog>
            )}
        </div>
    );
}
