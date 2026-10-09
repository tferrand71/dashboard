import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { promises as fs } from "fs";
import path from "path";

const DRIVE_DIR = path.join(process.cwd(), "data", "drive");

async function deleteFolder(folderId: string, ownerId: string) {
    const children = await prisma.folder.findMany({ where: { parentId: folderId, ownerId } });
    for (const child of children) {
        await deleteFolder(child.id, ownerId);
    }

    const files = await prisma.file.findMany({ where: { folderId, ownerId } });
    for (const file of files) {
        await fs.unlink(path.join(DRIVE_DIR, file.storagePath)).catch(() => {});
    }
    await prisma.file.deleteMany({ where: { folderId, ownerId } });
    await prisma.folder.delete({ where: { id: folderId } });
}

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    const session = await auth();
    if (!session?.user?.email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const user = await prisma.user.findUnique({ where: { email: session.user.email } });
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id } = await params;

    const folder = await prisma.folder.findFirst({ where: { id, ownerId: user.id } });
    if (!folder) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const folders = await prisma.folder.findMany({
        where: { parentId: id, ownerId: user.id },
        orderBy: { name: "asc" },
        select: { id: true, name: true, createdAt: true, updatedAt: true },
    });

    const files = await prisma.file.findMany({
        where: { folderId: id, ownerId: user.id },
        orderBy: { name: "asc" },
        select: { id: true, name: true, size: true, mimeType: true, createdAt: true },
    });

    const breadcrumb = await buildBreadcrumb(folder, user.id);

    return NextResponse.json({ folder, folders, files, breadcrumb });
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    const session = await auth();
    if (!session?.user?.email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const user = await prisma.user.findUnique({ where: { email: session.user.email } });
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id } = await params;
    const { name } = await req.json();
    if (!name?.trim()) return NextResponse.json({ error: "Name required" }, { status: 400 });

    const folder = await prisma.folder.findFirst({ where: { id, ownerId: user.id } });
    if (!folder) return NextResponse.json({ error: "Not found" }, { status: 404 });

    try {
        const updated = await prisma.folder.update({
            where: { id },
            data: { name: name.trim() },
        });
        return NextResponse.json(updated);
    } catch {
        return NextResponse.json({ error: "A folder with this name already exists here" }, { status: 409 });
    }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    const session = await auth();
    if (!session?.user?.email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const user = await prisma.user.findUnique({ where: { email: session.user.email } });
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id } = await params;

    const folder = await prisma.folder.findFirst({ where: { id, ownerId: user.id } });
    if (!folder) return NextResponse.json({ error: "Not found" }, { status: 404 });

    await deleteFolder(id, user.id);

    return NextResponse.json({ ok: true });
}

async function buildBreadcrumb(
    folder: { id: string; name: string; parentId: string | null },
    ownerId: string,
): Promise<{ id: string; name: string }[]> {
    const crumbs: { id: string; name: string }[] = [];
    let current: { id: string; name: string; parentId: string | null } | null = folder;

    while (current) {
        crumbs.unshift({ id: current.id, name: current.name });
        if (!current.parentId) break;
        current = await prisma.folder.findFirst({
            where: { id: current.parentId, ownerId },
            select: { id: true, name: true, parentId: true },
        });
    }

    return crumbs;
}
