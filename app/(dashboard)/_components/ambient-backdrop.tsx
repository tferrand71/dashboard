/**
 * Les deux halos flous du hero du portfolio, en version sobre :
 * ils posent l'ambiance violette sans gêner la lecture des données.
 * Purement décoratifs, et coupés par `prefers-reduced-motion`.
 */
export function AmbientBackdrop() {
    return (
        <div
            aria-hidden="true"
            className="pointer-events-none fixed inset-0 -z-10 overflow-hidden"
        >
            <div className="ambient-glow absolute -left-1/4 -top-1/4 h-[70vw] w-[70vw] rounded-full bg-mauve/10 blur-[120px]" />
            <div
                className="ambient-glow absolute -bottom-1/4 -right-1/4 h-[60vw] w-[60vw] rounded-full bg-pink/[0.07] blur-[110px]"
                style={{ animationDelay: "-9s", animationDuration: "24s" }}
            />
        </div>
    );
}
