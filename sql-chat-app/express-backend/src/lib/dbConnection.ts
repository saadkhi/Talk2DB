import { Pool } from "pg";
import { decrypt } from "./encryption";

const poolCache = new Map<string, Pool>();

export async function getUserDbPool(encryptedConnectionString: string): Promise<Pool> {
    const connectionString = decrypt(encryptedConnectionString);
    if (poolCache.has(connectionString)) return poolCache.get(connectionString)!;
    const pool = new Pool({
        connectionString,
        ssl: { rejectUnauthorized: false },
        max: 3,
        idleTimeoutMillis: 30000,
        connectionTimeoutMillis: 5000,
        statement_timeout: 30000, // 30 second query timeout
    });
    poolCache.set(connectionString, pool);
    return pool;
}

export async function executeQuery(encryptedConnectionString: string, sql: string): Promise<{ columns: string[], rows: any[] }> {
    const pool = await getUserDbPool(encryptedConnectionString);
    const result = await pool.query(sql);
    const columns = result.fields.map(f => f.name);
    return { columns, rows: result.rows };
}
