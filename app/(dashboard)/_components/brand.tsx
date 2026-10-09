import Link from "next/link";

/** Reprend la signature du portfolio : « Tobias » + point or. */
export function Brand({ compact = false }: { compact?: boolean }) {
    return (
        <Link
            href="/"
            className="group flex items-center gap-3 rounded-lg"
            aria-label="Accueil du tableau de bord"
        >
            <span
                aria-hidden="true"
                className="flex h-9 w-9 items-center justify-center rounded-xl border border-hairline-strong bg-glass font-serif text-base font-bold text-gold transition-colors group-hover:border-gold/50"
            >
                T
            </span>
            {!compact && (
                <span className="leading-tight">
                    <span className="block font-serif text-base font-bold tracking-tight text-text-main">
                        Tobias<span className="text-gold">.</span>
                    </span>
                    <span className="block font-mono text-[10px] uppercase tracking-[0.2em] text-text-muted">
                        infra
                    </span>
                </span>
            )}
        </Link>
    );
}
