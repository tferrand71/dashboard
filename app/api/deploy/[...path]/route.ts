import { auth } from "@/auth";
import { NextRequest, NextResponse } from "next/server";

const AGENT_URL = process.env.DEPLOY_AGENT_URL ?? "http://deploy-agent:3001";

async function proxy(req: NextRequest, path: string[]): Promise<NextResponse> {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

  const url = `${AGENT_URL}/${path.join("/")}`;
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };

  let body: string | undefined;
  if (req.method !== "GET") {
    body = await req.text();
  }

  const res = await fetch(url, {
    method: req.method,
    headers,
    body,
  });

  const data = res.status === 204 ? null : await res.json();
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
