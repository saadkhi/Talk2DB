/**
 * Prisma client using the @prisma/adapter-pg driver adapter.
 *
 * Why: Prisma's native query engine binary (libquery_engine-*.so.node) fails to
 * connect to Neon on this machine when Node 22 is active. The root cause is that
 * the Rust engine's DNS resolver picks the IPv6 address returned by the Neon
 * hostname, but Neon's PostgreSQL port 5432 is IPv4-only. The `pg` Node driver
 * (used by the adapter) respects Node's own DNS/networking stack which handles
 * the IPv4/IPv6 fallback correctly.
 *
 * The adapter replaces the Rust engine entirely — Prisma's query layer runs
 * in-process and delegates actual SQL execution to `pg`, which already works.
 */

import { Pool } from "pg";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";

/**
 * Sanitize DATABASE_URL at startup.
 * Handles common formats users paste into Vercel env vars.
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
            (url.startsWith("'") && url.endsWith("'")) ||
            (url.startsWith('"') && url.endsWith('"')) ||
            (url.startsWith("`") && url.endsWith("`"))
        ) {
            url = url.slice(1, -1).trim();
        } else {
            break;
        }
    }

    if (!url.startsWith("postgresql://") && !url.startsWith("postgres://")) {
        throw new Error(
            `DATABASE_URL has an invalid format. Got: "${url.substring(0, 30)}..."\n` +
            "It must start with postgresql:// or postgres://"
        );
    }

    return url;
}

const connectionString = getCleanDatabaseUrl();

// Keep process.env in sync so other code that reads it directly still works
if (process.env.DATABASE_URL !== connectionString) {
    process.env.DATABASE_URL = connectionString;
}

// Singleton pattern — reuse the Pool and PrismaClient across hot-reloads in dev
const globalForPrisma = globalThis as unknown as {
    prismaPool: Pool | undefined;
    prisma: PrismaClient | undefined;
};

function createPrismaClient(): PrismaClient {
    const pool =
        globalForPrisma.prismaPool ??
        new Pool({
            connectionString,
            ssl: { rejectUnauthorized: false },
            max: 10,
            idleTimeoutMillis: 30_000,
            connectionTimeoutMillis: 10_000,
        });

    if (!globalForPrisma.prismaPool) {
        globalForPrisma.prismaPool = pool;
    }

    const adapter = new PrismaPg(pool);

    return new PrismaClient({ adapter } as any);
}

export const prisma: PrismaClient =
    globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== "production") {
    globalForPrisma.prisma = prisma;
}

export default prisma;
