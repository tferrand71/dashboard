import Link from "next/link";

/** Logo carré + nom de la console. */
export function Brand() {
    return (
        <Link
            href="/"
            className="flex items-center gap-2.5 rounded-md"
            aria-label="Vue d'ensemble"
        >
            <span
                aria-hidden="true"
                className="flex h-7 w-7 items-center justify-center rounded-md bg-gradient-to-br from-accent to-accent-hover text-[13px] font-bold text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.2)]"
            >
                T
            </span>
            <span className="leading-tight">
                <span className="block text-[13px] font-semibold text-fg">Infrastructure</span>
                <span className="block font-mono text-[10px] text-fg-subtle">tobias-ferrand.fr</span>
            </span>
        </Link>
    );
}
