import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { promises as fs } from "fs";
import path from "path";
import { randomUUID } from "crypto";

const DRIVE_DIR = path.join(process.cwd(), "data", "drive");

export async function POST(req: NextRequest) {
    const session = await auth();
    if (!session?.user?.email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const user = await prisma.user.findUnique({ where: { email: session.user.email } });
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const formData = await req.formData();
    const folderId = (formData.get("folderId") as string | null) || null;

    if (folderId) {
        const folder = await prisma.folder.findFirst({ where: { id: folderId, ownerId: user.id } });
        if (!folder) return NextResponse.json({ error: "Folder not found" }, { status: 404 });
    }

    await fs.mkdir(DRIVE_DIR, { recursive: true });

    const uploadedFiles = [];
    const errors = [];

    for (const [key, value] of formData.entries()) {
        if (key !== "file" && !key.startsWith("file")) continue;
        if (!(value instanceof File)) continue;

        const file = value as File;
        const storagePath = randomUUID();
        const dest = path.join(DRIVE_DIR, storagePath);

        try {
            const buffer = Buffer.from(await file.arrayBuffer());
            await fs.writeFile(dest, buffer);

            const record = await prisma.file.create({
                data: {
                    name: file.name,
                    size: file.size,
                    mimeType: file.type || "application/octet-stream",
                    folderId,
                    storagePath,
                    ownerId: user.id,
                },
            });

            uploadedFiles.push(record);
        } catch (err: unknown) {
            await fs.unlink(dest).catch(() => {});
            const message = err instanceof Error ? err.message : "Unknown error";
            errors.push({ name: file.name, error: message });
        }
    }

    return NextResponse.json({ uploaded: uploadedFiles, errors }, { status: 201 });
}
