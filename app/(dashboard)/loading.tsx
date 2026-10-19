import { Skeleton } from "./_components/ui";

export default function Loading() {
    return (
        <div aria-busy="true" aria-live="polite">
            <span className="sr-only">Chargement…</span>

            <div className="space-y-2 border-b border-line pb-6">
                <Skeleton className="h-7 w-56" />
                <Skeleton className="h-4 w-96 max-w-full" />
            </div>

            <div className="mt-8 grid grid-cols-2 gap-3 lg:grid-cols-5">
                {[0, 1, 2, 3, 4].map((i) => (
                    <div key={i} className="card space-y-3 p-4">
                        <Skeleton className="h-3.5 w-24" />
                        <Skeleton className="h-7 w-16" />
                        <Skeleton className="h-1.5 w-full" />
                    </div>
                ))}
            </div>

            <div className="mt-6 grid gap-6 lg:grid-cols-3">
                <div className="card h-72 lg:col-span-2" />
                <div className="card h-72" />
            </div>
        </div>
    );
}
