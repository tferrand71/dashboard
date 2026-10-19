"use client";

import { useState, useTransition } from "react";
import { signOut } from "next-auth/react";
import { LogOut } from "lucide-react";

export function SignOutButton() {
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

    return (
        <>
            <button
                type="button"
                onClick={handleSignOut}
                disabled={isPending}
                title="Se déconnecter"
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-fg-subtle transition-colors hover:bg-elevated hover:text-down disabled:opacity-50"
            >
                <LogOut className="h-4 w-4" />
                <span className="sr-only">
                    {isPending ? "Déconnexion en cours" : "Se déconnecter"}
                </span>
            </button>
            {failed && (
                <p role="alert" className="text-[11px] text-down">
                    Déconnexion impossible. Réessaie.
                </p>
            )}
        </>
    );
}
