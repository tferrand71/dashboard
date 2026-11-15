import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { getPlugStatus, plugConfigured, plugOn, restartServer } from "@/lib/plug";

export async function GET() {
    const session = await auth();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    if (!plugConfigured()) return NextResponse.json({ configured: false });
    try {
        return NextResponse.json({ configured: true, reachable: true, status: await getPlugStatus() });
    } catch {
        return NextResponse.json({ configured: true, reachable: false });
    }
}

export async function POST(request: Request) {
    const session = await auth();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    // Action sensible : on n'accepte que les requêtes émises depuis le dashboard lui-même.
    const origin = request.headers.get("origin");
    if (origin && new URL(origin).host !== request.headers.get("host")) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    if (!plugConfigured()) return NextResponse.json({ error: "Prise non configurée" }, { status: 404 });

    let body: { action?: string; force?: boolean };
    try {
        body = await request.json();
    } catch {
        return NextResponse.json({ error: "Corps invalide" }, { status: 400 });
    }

    if (body.action === "restart") {
        const result = await restartServer(body.force === true);
        return NextResponse.json(result, { status: result.ok ? 200 : result.blocked ? 409 : 502 });
    }
    if (body.action === "on") {
        const result = await plugOn();
        return NextResponse.json(result, { status: result.ok ? 200 : 502 });
    }
    return NextResponse.json({ error: "Action inconnue" }, { status: 400 });
}
