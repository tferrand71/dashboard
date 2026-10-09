import type { ComponentType } from "react";

type Props = {
    title: string;
    description: string;
    icon: ComponentType<{ className?: string }>;
};

/**
 * Module pas encore construit. La carte explique à quoi il servira et
 * reste explicitement inerte : pas de lien, pas de chiffre, pas de faux
 * graphique pour « remplir ».
 */
export function ModuleCard({ title, description, icon: Icon }: Props) {
    return (
        <article className="glass-panel group rounded-2xl p-5 transition-colors hover:border-hairline-strong">
            <div className="mb-4 flex items-start justify-between gap-3">
                <span
                    aria-hidden="true"
                    className="flex h-10 w-10 items-center justify-center rounded-xl border border-hairline bg-ink/40 text-text-muted transition-colors group-hover:border-mauve/40 group-hover:text-mauve-text"
                >
                    <Icon className="h-5 w-5" />
                </span>
                <span className="rounded-full border border-gold/25 bg-gold/5 px-2.5 py-1 font-mono text-[9px] font-bold uppercase tracking-[0.15em] text-gold">
                    Bientôt
                </span>
            </div>

            <h3 className="font-serif text-base font-bold tracking-tight text-text-main">
                {title}
            </h3>
            <p className="mt-1.5 text-xs leading-relaxed text-text-muted">
                {description}
            </p>
        </article>
    );
}
