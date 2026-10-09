import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { AmbientBackdrop } from "./_components/ambient-backdrop";
import { MobileHeader } from "./_components/mobile-header";
import { MobileNav } from "./_components/mobile-nav";
import { Sidebar } from "./_components/sidebar";

export default async function DashboardLayout({ children }: LayoutProps<"/">) {
    const session = await auth();

    if (!session?.user?.email) {
        redirect("/login");
    }

    const email = session.user.email;

    return (
        <div className="relative flex min-h-screen bg-midnight">
            <AmbientBackdrop />

            <a
                href="#contenu"
                className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded-lg focus:bg-gold focus:px-4 focus:py-2 focus:text-sm focus:font-bold focus:text-ink"
            >
                Aller au contenu
            </a>

            <Sidebar email={email} />

            <div className="flex min-w-0 flex-1 flex-col">
                <MobileHeader email={email} />
                <main
                    id="contenu"
                    /* pb généreux sous lg : la barre de navigation basse flotte
                       au-dessus du contenu. */
                    className="flex-1 px-4 pb-28 pt-6 sm:px-6 lg:px-10 lg:pb-12 lg:pt-10"
                >
                    {children}
                </main>
            </div>

            <MobileNav />
        </div>
    );
}
