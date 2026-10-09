import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
    const session = await auth();
    if (!session?.user?.email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const user = await prisma.user.findUnique({ where: { email: session.user.email } });
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const folders = await prisma.folder.findMany({
        where: { ownerId: user.id, parentId: null },
        orderBy: { name: "asc" },
        select: { id: true, name: true, createdAt: true, updatedAt: true },
    });

    const files = await prisma.file.findMany({
        where: { ownerId: user.id, folderId: null },
        orderBy: { name: "asc" },
        select: { id: true, name: true, size: true, mimeType: true, createdAt: true },
    });

    return NextResponse.json({ folders, files });
}

export async function POST(req: NextRequest) {
    const session = await auth();
    if (!session?.user?.email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const user = await prisma.user.findUnique({ where: { email: session.user.email } });
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { name, parentId } = await req.json();
    if (!name?.trim()) return NextResponse.json({ error: "Name required" }, { status: 400 });

    if (parentId) {
        const parent = await prisma.folder.findFirst({ where: { id: parentId, ownerId: user.id } });
        if (!parent) return NextResponse.json({ error: "Parent not found" }, { status: 404 });
    }

    try {
        const folder = await prisma.folder.create({
            data: { name: name.trim(), parentId: parentId ?? null, ownerId: user.id },
        });
        return NextResponse.json(folder, { status: 201 });
    } catch {
        return NextResponse.json({ error: "A folder with this name already exists here" }, { status: 409 });
    }
}
