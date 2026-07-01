function sanitizeUrl(url: string | undefined): string | undefined {
    if (!url) return undefined;
    let sanitized = url.trim();

    // Check if it's a psql command like: psql 'postgresql://...'
    if (sanitized.toLowerCase().startsWith("psql ")) {
        const matches = sanitized.match(/(?:postgresql|postgres):\/\/[^\s'"]+/i);
        if (matches) {
            sanitized = matches[0];
        }
    }

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
        // In production, use proper logging service instead of console.error
        if (process.env.NODE_ENV !== 'production') {
            console.error("CRITICAL: DATABASE_URL does not start with a valid protocol (postgresql:// or postgres://).");
            const masked = sanitizedUrl.replace(/:[^:@]+@/, ":****@");
            console.error(`Malformed URL detected: "${masked.substring(0, 20)}..."`);
        }
        throw new Error("Invalid DATABASE_URL: must start with postgresql:// or postgres://");
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
