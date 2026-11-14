import { auth } from "@/auth";
import { forwardToService } from "@/lib/service-proxy";
import { NextRequest, NextResponse } from "next/server";

/**
 * Relais vers deploy-cron (programmation des déploiements). Même principe que /api/deploy/* : la session
 * du dashboard est vérifiée ici, puis le jeton AGENT_API_TOKEN est ajouté côté serveur : le navigateur
 * ne le voit jamais. Seul /schedules est relayé.
 */
const CRON_URL = process.env.DEPLOY_CRON_URL ?? "http://deploy-cron:3002";

async function handle(req: NextRequest, path: string[]): Promise<NextResponse> {
    const session = await auth();
    if (!session) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

    if (path[0] !== "schedules") return NextResponse.json({ error: "Route inconnue" }, { status: 404 });

    const token = process.env.AGENT_API_TOKEN;
    if (!token) return NextResponse.json({ error: "AGENT_API_TOKEN non configurée sur le dashboard" }, { status: 500 });

    const body = req.method === "GET" || req.method === "DELETE" ? undefined : (await req.text()) || undefined;
    const result = await forwardToService({
        method: req.method,
        path,
        search: req.nextUrl.search,
        body,
        baseUrl: CRON_URL,
        token,
        label: "deploy-cron",
    });

    if (result.status === 204) return new NextResponse(null, { status: 204 });
    return NextResponse.json(result.body, { status: result.status });
}

type Context = { params: Promise<{ path: string[] }> };

export async function GET(req: NextRequest, { params }: Context) {
    return handle(req, (await params).path);
}

export async function POST(req: NextRequest, { params }: Context) {
    return handle(req, (await params).path);
}

export async function DELETE(req: NextRequest, { params }: Context) {
    return handle(req, (await params).path);
}
