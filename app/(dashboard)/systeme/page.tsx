import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { SystemMonitor } from "./_components/system-monitor";

export const metadata: Metadata = { title: "Système" };

export default async function SystemePage() {
  const session = await auth();
  if (!session) redirect("/login");

  return (
    <div className="mx-auto max-w-5xl">
      <header className="animate-rise">
        <p className="eyebrow">Infrastructure</p>
        <h1 className="mt-2 font-serif text-3xl font-bold leading-[1.1] tracking-tight text-text-main sm:text-4xl">
          Système
        </h1>
        <p className="mt-3 max-w-md text-sm font-light leading-relaxed text-text-muted">
          Ressources du VPS et état des conteneurs Docker — rafraîchi toutes les 5 secondes.
        </p>
      </header>

      <div className="mt-10 sm:mt-12">
        <SystemMonitor />
      </div>
    </div>
  );
}
