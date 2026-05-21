import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient };

let databaseUrl = process.env.DATABASE_URL || "";
if (databaseUrl.startsWith('"') && databaseUrl.endsWith('"')) {
    databaseUrl = databaseUrl.slice(1, -1);
}
if (databaseUrl.startsWith("'") && databaseUrl.endsWith("'")) {
    databaseUrl = databaseUrl.slice(1, -1);
}

export const prisma = globalForPrisma.prisma || new PrismaClient({
    datasources: {
        db: {
            url: databaseUrl || undefined
        }
    }
});

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;

export default prisma;
