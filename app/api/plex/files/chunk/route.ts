import { NextResponse } from "next/server";
import { Readable } from "node:stream";
import type { ReadableStream as NodeWebStream } from "node:stream/web";
import { auth } from "@/auth";
import { gate, mediaConfigured, sameOrigin } from "@/lib/media";

// Cette route est exclue de proxy.ts (voir son `matcher`) : le proxy copierait sinon le corps
// en mémoire et le tronquerait au-delà de 10 Mo. La session est donc vérifiée ici.

const MAX_CHUNK = 64 * 1024 * 1024;

/** PUT ?path=&offset=&length= : relaye les octets du morceau vers la passerelle, sans les stocker. */
export async function PUT(request: Request) {
    const session = await auth();
    if (!session) return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
    if (!sameOrigin(request)) return NextResponse.json({ ok: false, error: "Forbidden" }, { status: 403 });
    if (!mediaConfigured()) return NextResponse.json({ ok: false, error: "Non configuré" }, { status: 404 });

    const q = new URL(request.url).searchParams;
    const path = q.get("path") ?? "";
    const offset = Number(q.get("offset"));
    const length = Number(q.get("length"));
    if (!path || !Number.isInteger(offset) || !Number.isInteger(length) || offset < 0 || length <= 0 || length > MAX_CHUNK) {
        return NextResponse.json({ ok: false, error: "Paramètres invalides" }, { status: 400 });
    }
    if (!request.body) return NextResponse.json({ ok: false, error: "Corps manquant" }, { status: 400 });

    try {
        const body = Readable.fromWeb(request.body as unknown as NodeWebStream);
        const r = await gate({ op: "chunk", path, offset, length }, body);
        return NextResponse.json(r, { status: r.ok ? 200 : r.error === "décalage" ? 409 : 400 });
    } catch (e) {
        return NextResponse.json(
            { ok: false, error: e instanceof Error ? e.message : "Serveur Plex injoignable" },
            { status: 502 },
        );
    }
}
