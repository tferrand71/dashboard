"use client";

import { signOut } from "next-auth/react";

export function SignOutButton({ className }: { className?: string }) {
    return (
        <button
            type="button"
            onClick={() => signOut({ callbackUrl: "/login" })}
            className={
                className ??
                "text-sm text-text-secondary transition-colors hover:text-text-primary"
            }
        >
            Se déconnecter
        </button>
    );
}
