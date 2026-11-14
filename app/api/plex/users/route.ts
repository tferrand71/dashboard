import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { getPlexAccounts } from "@/lib/plex";

export async function GET() {
    const session = await auth();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const accounts = await getPlexAccounts();
    if (accounts === null) return NextResponse.json({ error: "Plex injoignable" }, { status: 502 });

    return NextResponse.json({ accounts });
}
