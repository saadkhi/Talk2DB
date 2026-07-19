import { Pool } from "pg";
import { decrypt } from "./encryption";
import crypto from "crypto";

// Key pool cache by a SHA-256 hash of the ENCRYPTED string, not plaintext.
// This avoids storing raw credentials as Map keys in memory.
const poolCache = new Map<string, Pool>();

function cacheKey(encryptedStr: string): string {
    return crypto.createHash("sha256").update(encryptedStr).digest("hex");
}

export async function getUserDbPool(encryptedConnectionString: string): Promise<Pool> {
    const key = cacheKey(encryptedConnectionString);

    if (poolCache.has(key)) {
        const existing = poolCache.get(key)!;
        // Quick liveness check — if the pool's total count is 0 it was drained/ended,
        // remove it from cache so we recreate
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
        max: 5,
        idleTimeoutMillis: 30000,
        connectionTimeoutMillis: 8000,
        statement_timeout: 30000,
    });

    // Remove from cache if pool encounters a fatal error
    pool.on("error", () => {
        poolCache.delete(key);
    });

    poolCache.set(key, pool);
    return pool;
}

export async function executeQuery(
    encryptedConnectionString: string,
    sql: string
): Promise<{ columns: string[]; rows: any[] }> {
    const pool = await getUserDbPool(encryptedConnectionString);
    const result = await pool.query(sql);
    const columns = result.fields.map((f) => f.name);
    return { columns, rows: result.rows };
}
