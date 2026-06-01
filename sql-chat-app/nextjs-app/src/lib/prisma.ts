function sanitizeUrl(url: string | undefined): string | undefined {
    if (!url) return undefined;
    let sanitized = url.trim();

    // Recursively remove wrapping quotes
    while (
        (sanitized.startsWith('"') && sanitized.endsWith('"')) ||
        (sanitized.startsWith("'") && sanitized.endsWith("'")) ||
        (sanitized.startsWith("`") && sanitized.endsWith("`"))
    ) {
        sanitized = sanitized.slice(1, -1).trim();
    }

    return sanitized;
}

const rawUrl = process.env.DATABASE_URL;
const sanitizedUrl = sanitizeUrl(rawUrl);

if (sanitizedUrl) {
    // Basic validation
    if (!sanitizedUrl.startsWith("postgresql://") && !sanitizedUrl.startsWith("postgres://")) {
        console.error("CRITICAL: DATABASE_URL does not start with a valid protocol (postgresql:// or postgres://).");
        // Mask the URL for safer logging
        const masked = sanitizedUrl.replace(/:[^:@]+@/, ":****@");
        console.error(`Malformed URL detected: "${masked.substring(0, 20)}..."`);
    }
    process.env.DATABASE_URL = sanitizedUrl;
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
