import { redirect } from "next/navigation";
import { auth } from "../../auth";
import { Sidebar } from "./_components/sidebar";

export default async function DashboardLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const session = await auth();

    if (!session?.user?.email) {
        redirect("/login");
    }

    return (
        <div className="flex min-h-screen bg-bg">
            <Sidebar email={session.user.email} />
            <main className="flex-1 px-10 py-10">{children}</main>
        </div>
    );
}
