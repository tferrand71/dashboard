import { auth } from "@/auth";
import { NextRequest, NextResponse } from "next/server";

const AGENT_URL = process.env.DEPLOY_AGENT_URL ?? "http://deploy-agent:3001";

async function proxy(req: NextRequest, path: string[]): Promise<NextResponse> {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

  // Les paramètres de requête (filtres analytics…) suivent le chemin
  const url = `${AGENT_URL}/${path.map(encodeURIComponent).join("/")}${req.nextUrl.search}`;
  const headers: Record<string, string> = {};

  let body: string | undefined;
  if (req.method !== "GET") {
    body = (await req.text()) || undefined;
  }
  // Fastify renvoie 400 si Content-Type JSON est envoyé avec un corps vide
  if (body) headers["Content-Type"] = "application/json";

  const res = await fetch(url, {
    method: req.method,
    headers,
    body,
  });

  if (res.status === 204) return new NextResponse(null, { status: 204 });
  const data = await res.json();
  return NextResponse.json(data, { status: res.status });
}

export async function GET(req: NextRequest, { params }: { params: Promise<{ path: string[] }> }) {
  const { path } = await params;
  return proxy(req, path);
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ path: string[] }> }) {
  const { path } = await params;
  return proxy(req, path);
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ path: string[] }> }) {
  const { path } = await params;
  return proxy(req, path);
}
