import { PrismaClient } from "@prisma/client";

// En dev, `next dev` recharge les modules à chaud : sans ce cache global on
// ouvrirait un nouveau pool de connexions à chaque rechargement.
const globalForPrisma = globalThis as unknown as {
    prisma: PrismaClient | undefined;
};

export const prisma = globalForPrisma.prisma ?? new PrismaClient();

if (process.env.NODE_ENV !== "production") {
    globalForPrisma.prisma = prisma;
}
