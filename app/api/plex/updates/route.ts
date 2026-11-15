import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { mediaConfigured, sameOrigin } from "@/lib/media";
import { aptCheck, aptStatus, aptUpgrade } from "@/lib/updates";

function unreachable(e: unknown) {
    return NextResponse.json(
        { configured: true, reachable: false, error: e instanceof Error ? e.message : "Serveur Plex injoignable" },
        { status: 200 },
    );
}

/** GET : état des mises à jour (paquets en attente, mise à jour en cours, journal). */
export async function GET() {
    const session = await auth();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (!mediaConfigured()) return NextResponse.json({ configured: false });

    try {
        const r = await aptStatus();
        if (!r.ok) return NextResponse.json({ configured: true, reachable: false, error: r.error });
        return NextResponse.json({ configured: true, reachable: true, ...r });
    } catch (e) {
        return unreachable(e);
    }
}

/** POST { action: "check" } rafraîchit la liste ; { action: "upgrade", force? } lance la mise à jour. */
export async function POST(request: Request) {
    const session = await auth();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (!sameOrigin(request)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    if (!mediaConfigured()) return NextResponse.json({ ok: false, error: "Non configuré" }, { status: 404 });

    let body: { action?: string; force?: boolean };
    try {
        body = await request.json();
    } catch {
        return NextResponse.json({ ok: false, error: "Corps invalide" }, { status: 400 });
    }

    try {
        if (body.action === "check") {
            const r = await aptCheck();
            return NextResponse.json(r, { status: r.ok ? 200 : 400 });
        }
        if (body.action === "upgrade") {
            const r = await aptUpgrade(body.force === true);
            return NextResponse.json(r, { status: r.ok ? 200 : r.blocked ? 409 : 400 });
        }
        return NextResponse.json({ ok: false, error: "Action inconnue" }, { status: 400 });
    } catch (e) {
        return NextResponse.json(
            { ok: false, error: e instanceof Error ? e.message : "Serveur Plex injoignable" },
            { status: 502 },
        );
    }
}
