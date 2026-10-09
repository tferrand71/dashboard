"use client";

import { useState, useTransition } from "react";
import { signOut } from "next-auth/react";
import { LogoutIcon } from "./icons";

type Props = {
    /** `icon` pour la barre mobile, `full` pour le pied de sidebar. */
    variant?: "full" | "icon";
};

export function SignOutButton({ variant = "full" }: Props) {
    const [isPending, startTransition] = useTransition();
    const [failed, setFailed] = useState(false);

    const handleSignOut = () => {
        setFailed(false);
        startTransition(async () => {
            try {
                await signOut({ callbackUrl: "/login" });
            } catch {
                // Réseau coupé ou endpoint injoignable : on le dit au lieu de
                // laisser le bouton tourner dans le vide.
                setFailed(true);
            }
        });
    };

    if (variant === "icon") {
        return (
            <button
                type="button"
                onClick={handleSignOut}
                disabled={isPending}
                className="flex h-9 w-9 items-center justify-center rounded-xl border border-hairline text-text-muted transition-colors hover:border-down/40 hover:text-down disabled:opacity-50"
            >
                <LogoutIcon className="h-4 w-4" />
                <span className="sr-only">
                    {isPending ? "Déconnexion en cours" : "Se déconnecter"}
                </span>
            </button>
        );
    }

    return (
        <div>
            <button
                type="button"
                onClick={handleSignOut}
                disabled={isPending}
                className="flex w-full items-center gap-2.5 rounded-xl border border-hairline px-3 py-2 text-xs font-medium text-text-muted transition-colors hover:border-down/40 hover:text-down disabled:opacity-50"
            >
                <LogoutIcon className="h-4 w-4" />
                {isPending ? "Déconnexion…" : "Se déconnecter"}
            </button>
            {failed && (
                <p role="alert" className="mt-2 text-[11px] text-down">
                    Déconnexion impossible. Réessaie.
                </p>
            )}
        </div>
    );
}
