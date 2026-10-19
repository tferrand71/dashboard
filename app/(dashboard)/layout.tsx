import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { Sidebar } from "./_components/sidebar";
import { Topbar } from "./_components/topbar";

export default async function DashboardLayout({ children }: LayoutProps<"/">) {
    const session = await auth();

    if (!session?.user?.email) {
        redirect("/login");
    }

    const email = session.user.email;

    return (
        <div className="flex min-h-screen bg-canvas">
            <a
                href="#contenu"
                className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded-md focus:bg-fg focus:px-4 focus:py-2 focus:text-sm focus:font-medium focus:text-canvas"
            >
                Aller au contenu
            </a>

            <Sidebar email={email} />

            <div className="flex min-w-0 flex-1 flex-col">
                <Topbar email={email} />
                <main id="contenu" className="flex-1 px-4 pb-16 pt-8 sm:px-6 lg:px-8">
                    <div className="mx-auto max-w-6xl">{children}</div>
                </main>
            </div>
        </div>
    );
}
