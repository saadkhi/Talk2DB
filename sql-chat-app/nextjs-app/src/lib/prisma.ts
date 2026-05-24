if (process.env.DATABASE_URL) {
    let url = process.env.DATABASE_URL.trim();
    if (url.startsWith('"') && url.endsWith('"')) {
        url = url.slice(1, -1);
    }
    if (url.startsWith("'") && url.endsWith("'")) {
        url = url.slice(1, -1);
    }
    process.env.DATABASE_URL = url.trim();
}

import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient };

export const prisma = globalForPrisma.prisma || new PrismaClient({
    datasources: {
        db: {
            url: process.env.DATABASE_URL || undefined
        }
    }
});

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;

export default prisma;
