import Link from "next/link";

export default function NotFound() {
    return (
        <div className="flex min-h-screen items-center justify-center px-4">
            <div className="text-center">
                <p className="eyebrow">Erreur 404</p>
                <h1 className="mt-3 font-serif text-4xl font-bold tracking-tight text-text-main">
                    Page <span className="text-gradient-energetic">introuvable.</span>
                </h1>
                <p className="mt-3 text-sm text-text-muted">
                    Ce module n&apos;existe pas encore.
                </p>
                <Link
                    href="/"
                    className="mt-8 inline-block rounded-full border border-gold/40 px-6 py-2.5 text-xs font-bold uppercase tracking-[0.15em] text-gold transition-colors hover:bg-gold hover:text-ink"
                >
                    Retour à l&apos;accueil
                </Link>
            </div>
        </div>
    );
}
