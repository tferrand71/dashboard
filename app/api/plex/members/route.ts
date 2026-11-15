import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { sameOrigin } from "@/lib/media";
import { createHomeProfile, inviteFriend, listMembers, plexUsersConfigured, removeMember, setLibraries } from "@/lib/plexusers";

/** GET : membres du serveur Plex (admin, profils du Home, amis) et bibliothèques disponibles. */
export async function GET() {
    const session = await auth();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (!plexUsersConfigured()) return NextResponse.json({ ok: false, configured: false });

    const r = await listMembers();
    return NextResponse.json(r, { status: r.ok ? 200 : 502 });
}

type Body = { action?: string; identifier?: unknown; name?: unknown; userId?: unknown; libraryIds?: unknown };

/** POST { action } : invite, createHome, setLibraries, remove. */
export async function POST(request: Request) {
    const session = await auth();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (!sameOrigin(request)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    if (!plexUsersConfigured()) return NextResponse.json({ ok: false, error: "Plex non configuré" }, { status: 404 });

    let b: Body;
    try {
        b = (await request.json()) as Body;
    } catch {
        return NextResponse.json({ ok: false, error: "Corps invalide" }, { status: 400 });
    }

    let r;
    switch (b.action) {
        case "invite":
            r = await inviteFriend(b.identifier, b.libraryIds);
            break;
        case "createHome":
            r = await createHomeProfile(b.name, b.libraryIds);
            break;
        case "setLibraries":
            r = await setLibraries(b.userId, b.libraryIds);
            break;
        case "remove":
            r = await removeMember(b.userId);
            break;
        default:
            return NextResponse.json({ ok: false, error: "Action inconnue" }, { status: 400 });
    }
    return NextResponse.json(r, { status: r.ok ? 200 : 400 });
}
