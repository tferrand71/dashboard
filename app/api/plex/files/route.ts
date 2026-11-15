import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { gate, mediaConfigured, refreshPlexLibrary, rootOf, sameOrigin } from "@/lib/media";
import type { RemoteItem, RemoteRoot } from "@/lib/media";

function unreachable(e: unknown) {
    return NextResponse.json(
        { ok: false, error: e instanceof Error ? e.message : "Serveur Plex injoignable" },
        { status: 502 },
    );
}

/** GET ?path= : sans chemin, les bibliothèques ; avec un chemin, le contenu du dossier. */
export async function GET(request: Request) {
    const session = await auth();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (!mediaConfigured()) return NextResponse.json({ ok: false, configured: false });

    const path = new URL(request.url).searchParams.get("path") ?? "";
    try {
        if (!path) {
            const r = await gate<{ roots: RemoteRoot[] }>({ op: "roots" });
            return NextResponse.json(r);
        }
        const r = await gate<{ items: RemoteItem[]; free: number; total: number }>({ op: "ls", path });
        return NextResponse.json(r, { status: r.ok ? 200 : 400 });
    } catch (e) {
        return unreachable(e);
    }
}

type Body = { action?: string; path?: string; size?: number; resume?: boolean; root?: string };

/** POST { action } : mkdir, delete, begin, end, abort (le contenu passe par /chunk), refresh. */
export async function POST(request: Request) {
    const session = await auth();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (!sameOrigin(request)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    if (!mediaConfigured()) return NextResponse.json({ ok: false, error: "Non configuré" }, { status: 404 });

    let b: Body;
    try {
        b = (await request.json()) as Body;
    } catch {
        return NextResponse.json({ ok: false, error: "Corps invalide" }, { status: 400 });
    }
    const path = typeof b.path === "string" ? b.path : "";

    try {
        switch (b.action) {
            case "mkdir":
                return respond(await gate({ op: "mkdir", path }));
            case "delete": {
                const r = await gate({ op: "rm", path });
                const root = rootOf(path);
                if (r.ok && root) void refreshPlexLibrary(root);
                return respond(r);
            }
            case "begin":
                return respond(await gate({ op: "begin", path, size: b.size, resume: b.resume === true }));
            case "end":
                return respond(await gate({ op: "end", path, size: b.size }));
            case "abort":
                return respond(await gate({ op: "abort", path }));
            case "refresh": {
                const root = b.root === "film" || b.root === "serie" ? b.root : rootOf(path);
                if (!root) return NextResponse.json({ ok: false, error: "Bibliothèque inconnue" }, { status: 400 });
                return NextResponse.json({ ok: await refreshPlexLibrary(root) });
            }
            default:
                return NextResponse.json({ ok: false, error: "Action inconnue" }, { status: 400 });
        }
    } catch (e) {
        return unreachable(e);
    }
}

function respond(r: { ok: boolean }) {
    return NextResponse.json(r, { status: r.ok ? 200 : 400 });
}
