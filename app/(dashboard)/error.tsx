"use client";

import { useEffect } from "react";
import { AlertTriangle, RotateCw } from "lucide-react";

export default function DashboardError({
    error,
    retry,
}: {
    error: Error & { digest?: string };
    retry: () => void;
}) {
    useEffect(() => {
        // Pas de service de télémétrie ici : les logs du conteneur suffisent.
        console.error(error);
    }, [error]);

    return (
        <div className="mx-auto max-w-lg py-10">
            <div className="card p-6">
                <span className="flex h-9 w-9 items-center justify-center rounded-md border border-down/25 bg-down/10 text-down">
                    <AlertTriangle className="h-4 w-4" />
                </span>
                <h1 className="mt-4 text-lg font-semibold text-fg">Cette vue n&apos;a pas pu se charger</h1>
                <p className="mt-1.5 text-sm text-fg-muted">
                    Le plus souvent, PostgreSQL est injoignable depuis le conteneur.
                </p>

                {error.digest && (
                    <p className="mt-4 break-all rounded-md border border-line bg-canvas px-3 py-2 font-mono text-xs text-fg-subtle">
                        digest : {error.digest}
                    </p>
                )}

                <button type="button" onClick={() => retry()} className="btn btn-primary mt-6">
                    <RotateCw className="h-3.5 w-3.5" />
                    Réessayer
                </button>
            </div>
        </div>
    );
}
