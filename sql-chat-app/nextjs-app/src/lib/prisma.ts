import { PrismaClient } from "@prisma/client";

/**
 * Sanitize DATABASE_URL at startup.
 * Handles common formats users paste into Vercel env vars:
 *   - psql 'postgresql://...'   (with psql prefix)
 *   - "postgresql://..."        (with surrounding quotes)
 *   - postgresql://...          (clean — passed through as-is)
 */
function getCleanDatabaseUrl(): string {
    const raw = process.env.DATABASE_URL;

    if (!raw) {
        throw new Error(
            "DATABASE_URL is not set. Add it to your environment variables.\n" +
            "Example: postgresql://user:pass@host/db?sslmode=require"
        );
    }

    let url = raw.trim();

    // Strip psql prefix: psql 'postgresql://...'
    if (/^psql\s/i.test(url)) {
        const match = url.match(/(?:postgresql|postgres):\/\/[^\s'"` ]+/i);
        if (match) url = match[0];
    }

    // Strip wrapping quotes (up to 3 levels deep)
    for (let i = 0; i < 3; i++) {
        if (
            (url.startsWith("'")  && url.endsWith("'")) ||
            (url.startsWith('"')  && url.endsWith('"')) ||
            (url.startsWith("`")  && url.endsWith("`"))
        ) {
            url = url.slice(1, -1).trim();
        } else {
            break;
        }
    }

    // Validate protocol
    if (!url.startsWith("postgresql://") && !url.startsWith("postgres://")) {
        throw new Error(
            `DATABASE_URL has an invalid format. Got: "${url.substring(0, 30)}..."\n` +
            "It must start with postgresql:// or postgres://"
        );
    }

    return url;
}

const cleanUrl = getCleanDatabaseUrl();

// Update the env var so Prisma's own internal URL resolution also sees the clean value
if (process.env.DATABASE_URL !== cleanUrl) {
    process.env.DATABASE_URL = cleanUrl;
}

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient };

export const prisma =
    globalForPrisma.prisma ??
    new PrismaClient({
        datasourceUrl: cleanUrl,
    });

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;

export default prisma;
