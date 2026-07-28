import { Pool, Client } from "pg";
import { decrypt } from "./encryption";
import crypto from "crypto";

// Cache pools by SHA-256 of the encrypted string (never store plaintext as key).
const poolCache = new Map<string, Pool>();

function cacheKey(encryptedStr: string): string {
    return crypto.createHash("sha256").update(encryptedStr).digest("hex");
}

/**
 * Returns true if the connection string points to a Neon serverless database.
 * Neon free-tier instances sleep and cannot hold persistent TCP connections,
 * so we use a fresh Client per query instead of a Pool for Neon URLs.
 */
function isNeonUrl(url: string): boolean {
    return url.includes(".neon.tech");
}

export async function getUserDbPool(encryptedConnectionString: string): Promise<Pool> {
    const key = cacheKey(encryptedConnectionString);

    if (poolCache.has(key)) {
        const existing = poolCache.get(key)!;
        // If the pool was drained/ended, recreate it
        if ((existing as any).totalCount !== undefined && (existing as any).totalCount === 0) {
            poolCache.delete(key);
        } else {
            return existing;
        }
    }

    const connectionString = decrypt(encryptedConnectionString);

    const pool = new Pool({
        connectionString,
        ssl: { rejectUnauthorized: false },
        max: isNeonUrl(connectionString) ? 1 : 5,  // Neon: don't maintain many idle connections
        idleTimeoutMillis: isNeonUrl(connectionString) ? 1000 : 30000,  // Neon: drop idle sockets fast
        connectionTimeoutMillis: 10000,
        statement_timeout: 30000,
        // Neon: disable keepalive — the server closes idle connections
        keepAlive: !isNeonUrl(connectionString),
    });

    pool.on("error", () => {
        poolCache.delete(key);
    });

    poolCache.set(key, pool);
    return pool;
}

/**
 * Execute a SQL query against the user's database.
 *
 * For Neon databases: uses a fresh Client per call (connect → query → end)
 * to avoid "Can't reach database server" errors from stale pool sockets.
 *
 * For all other databases: uses a persistent Pool for better performance.
 */
export async function executeQuery(
    encryptedConnectionString: string,
    sql: string
): Promise<{ columns: string[]; rows: any[] }> {
    const connectionString = decrypt(encryptedConnectionString);

    if (isNeonUrl(connectionString)) {
        // Fresh client per query — avoids stale connection errors on Neon free tier
        const client = new Client({
            connectionString,
            ssl: { rejectUnauthorized: false },
            connectionTimeoutMillis: 10000,
            statement_timeout: 30000,
        });
        try {
            await client.connect();
            const result = await client.query(sql);
            const columns = result.fields.map((f) => f.name);
            return { columns, rows: result.rows };
        } finally {
            // Always close — never leave a dangling connection to Neon
            await client.end().catch(() => {});
        }
    }

    // Non-Neon: use pool as usual
    const pool = await getUserDbPool(encryptedConnectionString);
    const result = await pool.query(sql);
    const columns = result.fields.map((f) => f.name);
    return { columns, rows: result.rows };
}
