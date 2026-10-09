import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { createReadStream } from "fs";
import { promises as fs } from "fs";
import path from "path";
import { Readable } from "stream";

const DRIVE_DIR = path.join(process.cwd(), "data", "drive");

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    const session = await auth();
    if (!session?.user?.email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const user = await prisma.user.findUnique({ where: { email: session.user.email } });
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id } = await params;

    const file = await prisma.file.findFirst({ where: { id, ownerId: user.id } });
    if (!file) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const filePath = path.join(DRIVE_DIR, file.storagePath);

    try {
        await fs.access(filePath);
    } catch {
        return NextResponse.json({ error: "File not found on disk" }, { status: 404 });
    }

    const encodedName = encodeURIComponent(file.name).replace(/'/g, "%27");
    const stream = createReadStream(filePath);
    const webStream = Readable.toWeb(stream) as ReadableStream;

    return new NextResponse(webStream, {
        headers: {
            "Content-Type": file.mimeType,
            "Content-Length": String(file.size),
            "Content-Disposition": `attachment; filename="${encodedName}"; filename*=UTF-8''${encodedName}`,
        },
    });
}
