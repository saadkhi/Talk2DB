import { PrismaClient } from "@prisma/client";

// Ensure DATABASE_URL is set before creating the client.
// sanitizeConnectionString is intentionally NOT called here —
// the app's own DATABASE_URL should always be a clean URL already.
// User-supplied connection strings are sanitized in connect-db/route.ts.
if (!process.env.DATABASE_URL) {
    throw new Error(
        "DATABASE_URL is not set. Add it to your .env file.\n" +
        "Example: DATABASE_URL=\"postgresql://user:pass@host/db?sslmode=require\""
    );
}

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient };

export const prisma =
    globalForPrisma.prisma ??
    new PrismaClient({
        datasourceUrl: process.env.DATABASE_URL,
    });

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;

export default prisma;
