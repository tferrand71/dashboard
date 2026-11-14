import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { getPlexOverview } from "@/lib/plex";

export async function GET() {
    const session = await auth();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const overview = await getPlexOverview();
    return NextResponse.json(overview);
}
