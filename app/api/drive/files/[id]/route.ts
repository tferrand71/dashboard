import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { promises as fs } from "fs";
import path from "path";

const DRIVE_DIR = path.join(process.cwd(), "data", "drive");

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    const session = await auth();
    if (!session?.user?.email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const user = await prisma.user.findUnique({ where: { email: session.user.email } });
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id } = await params;
    const { name } = await req.json();
    if (!name?.trim()) return NextResponse.json({ error: "Name required" }, { status: 400 });

    const file = await prisma.file.findFirst({ where: { id, ownerId: user.id } });
    if (!file) return NextResponse.json({ error: "Not found" }, { status: 404 });

    try {
        const updated = await prisma.file.update({
            where: { id },
            data: { name: name.trim() },
        });
        return NextResponse.json(updated);
    } catch {
        return NextResponse.json({ error: "A file with this name already exists here" }, { status: 409 });
    }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    const session = await auth();
    if (!session?.user?.email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const user = await prisma.user.findUnique({ where: { email: session.user.email } });
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id } = await params;

    const file = await prisma.file.findFirst({ where: { id, ownerId: user.id } });
    if (!file) return NextResponse.json({ error: "Not found" }, { status: 404 });

    await fs.unlink(path.join(DRIVE_DIR, file.storagePath)).catch(() => {});
    await prisma.file.delete({ where: { id } });

    return NextResponse.json({ ok: true });
}
