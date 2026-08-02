import { Pool } from "pg";
import { PrismaClient } from "@prisma/client";
import { decrypt } from "./encryption";

const prisma = new PrismaClient();

// ── Pool cache entry with TTL metadata ───────────────────────────────────────

interface CacheEntry {
    pool: Pool;
    /** Timestamp (ms) after which this entry should be evicted. */
    expiresAt: number;
}

/**
 * How long a pool lives in the cache without being used.
 * 30 minutes limits the blast-radius of stale connections after a credential
 * rotation while keeping pools alive for typical interactive sessions.
 */
const POOL_TTL_MS = 30 * 60 * 1_000; // 30 minutes

/** Proactive cleanup sweep interval. */
const CLEANUP_INTERVAL_MS = 5 * 60 * 1_000; // 5 minutes

const poolCache = new Map<string, CacheEntry>();

// Periodic cleanup — close and evict pools whose TTL has elapsed
setInterval(() => {
    const now = Date.now();
    for (const [key, entry] of poolCache.entries()) {
        if (entry.expiresAt <= now) {
            entry.pool.end().catch(() => {
                // Ignore errors — pool may already be idle
            });
            poolCache.delete(key);
        }
    }
}, CLEANUP_INTERVAL_MS).unref(); // don't keep the process alive just for cleanup

// ── Pool factory ─────────────────────────────────────────────────────────────

export async function getUserDbPool(encryptedConnectionString: string): Promise<Pool> {
    const connectionString = decrypt(encryptedConnectionString);
    const now = Date.now();

    const cached = poolCache.get(connectionString);
    if (cached) {
        if (cached.expiresAt > now) {
            // Refresh TTL on access so actively-used pools are kept alive
            cached.expiresAt = now + POOL_TTL_MS;
            return cached.pool;
        }
        // Evict expired entry before creating a new one
        cached.pool.end().catch(() => {});
        poolCache.delete(connectionString);
    }

    const pool = new Pool({
        connectionString,
        ssl: { rejectUnauthorized: false },
        max: 3,
        idleTimeoutMillis: 30_000,
        connectionTimeoutMillis: 5_000,
        statement_timeout: 30_000, // 30-second per-query timeout
    });

    poolCache.set(connectionString, { pool, expiresAt: now + POOL_TTL_MS });
    return pool;
}

// ── Query execution with audit logging ───────────────────────────────────────

export interface ExecuteQueryOptions {
    /** User ID to associate with the audit log entry (task 1.6). */
    userId?: string;
    /** Source endpoint label for the audit log, e.g. "query" | "chat". */
    source?: string;
}

export async function executeQuery(
    encryptedConnectionString: string,
    sql: string,
    params?: any[],
    options: ExecuteQueryOptions = {}
): Promise<{ columns: string[]; rows: any[] }> {
    const pool = await getUserDbPool(encryptedConnectionString);
    const start = Date.now();

    // Truncate SQL stored in the audit log to avoid bloating the DB
    const sqlForLog = sql.length > 4_000 ? sql.slice(0, 4_000) + "…" : sql;
    const { userId, source = "unknown" } = options;

    try {
        const result = await pool.query(sql, params);
        const durationMs = Date.now() - start;

        // Fire-and-forget audit insert — never let logging crash the caller
        if (userId) {
            prisma.auditLog
                .create({
                    data: {
                        userId,
                        sql: sqlForLog,
                        source,
                        success: true,
                        durationMs,
                    },
                })
                .catch((err: Error) => {
                    if (process.env.NODE_ENV !== "production") {
                        console.error("[audit] Failed to write AuditLog:", err.message);
                    }
                });
        }

        const columns = result.fields.map((f) => f.name);
        return { columns, rows: result.rows };
    } catch (queryError: any) {
        const durationMs = Date.now() - start;

        if (userId) {
            prisma.auditLog
                .create({
                    data: {
                        userId,
                        sql: sqlForLog,
                        source,
                        success: false,
                        errorMessage: queryError?.message ?? "Unknown error",
                        durationMs,
                    },
                })
                .catch((err: Error) => {
                    if (process.env.NODE_ENV !== "production") {
                        console.error("[audit] Failed to write AuditLog:", err.message);
                    }
                });
        }

        throw queryError;
    }
}
