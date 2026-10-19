import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export default function NotFound() {
    return (
        <div className="flex min-h-screen items-center justify-center px-4">
            <div className="text-center">
                <p className="font-mono text-xs text-fg-subtle">404</p>
                <h1 className="mt-2 text-2xl font-semibold tracking-tight text-fg">Page introuvable</h1>
                <p className="mt-2 text-sm text-fg-muted">Ce module n&apos;existe pas encore.</p>
                <Link href="/" className="btn btn-secondary mt-6">
                    <ArrowLeft className="h-3.5 w-3.5" />
                    Vue d&apos;ensemble
                </Link>
            </div>
        </div>
    );
}
