import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { getPlexHistory } from "@/lib/plex";

export async function GET(req: NextRequest) {
    const session = await auth();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const accountId = Number(req.nextUrl.searchParams.get("accountId"));
    if (!Number.isInteger(accountId)) {
        return NextResponse.json({ error: "accountId requis" }, { status: 400 });
    }

    const history = await getPlexHistory(accountId);
    if (history === null) return NextResponse.json({ error: "Plex injoignable" }, { status: 502 });

    return NextResponse.json({ history });
}
