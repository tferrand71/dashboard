import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { DriveClient } from "./_components/drive-client";

export const metadata: Metadata = { title: "Drive" };

export default async function DrivePage() {
    const session = await auth();
    if (!session) redirect("/login");

    return (
        <div className="mx-auto max-w-5xl">
            <header className="animate-rise">
                <p className="eyebrow">Stockage</p>
                <h1 className="mt-2 font-serif text-3xl font-bold leading-[1.1] tracking-tight text-text-main sm:text-4xl">
                    Drive
                </h1>
                <p className="mt-3 max-w-md text-sm font-light leading-relaxed text-text-muted">
                    Vos fichiers personnels — organisez-les en dossiers, uploadez et téléchargez
                    à volonté.
                </p>
            </header>

            <DriveClient />
        </div>
    );
}
