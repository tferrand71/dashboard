"use client";

import { useEffect } from "react";

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
            <div className="glass-panel rounded-2xl p-6">
                <p className="eyebrow text-down">Erreur</p>
                <h1 className="mt-2 font-serif text-2xl font-bold tracking-tight text-text-main">
                    Cette vue n&apos;a pas pu se charger
                </h1>
                <p className="mt-3 text-sm leading-relaxed text-text-muted">
                    Le plus souvent, PostgreSQL est injoignable depuis le conteneur.
                </p>

                {error.digest && (
                    <p className="mt-4 break-all rounded-lg border border-hairline bg-ink/40 px-3 py-2 font-mono text-[11px] text-text-muted">
                        digest : {error.digest}
                    </p>
                )}

                <button
                    type="button"
                    onClick={() => retry()}
                    className="mt-6 rounded-full bg-gold px-6 py-2.5 text-xs font-bold uppercase tracking-[0.15em] text-ink transition-transform hover:scale-[1.03]"
                >
                    Réessayer
                </button>
            </div>
        </div>
    );
}
