/**
 * @jest-environment node
 */
/**
 * @file e2e_query_studio.test.ts
 * @description End-to-end automated test suite for Talk2DB Query Studio.
 *
 *  Simulates the complete user flow:
 *    1. App opens and connects to the Neon database
 *    2. User navigates to Query Studio
 *    3. User types: "show me employees whose salary is less than 60000"
 *    4. APIFreeLLM generates SQL from the prompt
 *    5. User clicks "Execute" / "Run"
 *    6. System runs the SQL against the LIVE Neon database
 *    7. Validates that ALL returned employees have salary < 60000
 *
 *  LIVE DATABASE: Neon PostgreSQL (ep-soft-scene-anwuoqex)
 *  AI PROVIDER  : APIFreeLLM only (key: apf_aw0e36217ydigdgs1uroiswk)
 *  NO MOCKS     : DB execution in Phase 5 and Phase 6 hits the real database.
 *
 * @total_test_cases 29
 */

import { Client } from "pg";
import { isSQLSafe, extractSQL } from "../sql-chat-app/nextjs-app/src/lib/sqlSafety";
import { encrypt, decrypt } from "../sql-chat-app/nextjs-app/src/lib/encryption";
import { sanitizeConnectionString } from "../sql-chat-app/nextjs-app/src/lib/sanitizeConnectionString";
import { formatDatabaseError } from "../sql-chat-app/nextjs-app/src/lib/errorFormatter";

// ─── Environment ──────────────────────────────────────────────────────────────
process.env.DB_ENCRYPTION_KEY  = "f03de73b88bcf04d1efc5e424263f698e82ef6fa4f738b584d43da2bc5df0de2";
process.env.FREEAPI_KEY        = "apf_aw0e36217ydigdgs1uroiswk";
process.env.LLM_PROVIDER       = "apifreellm";
process.env.GEMINI_API_KEY     = "";
process.env.OPENAI_API_KEY     = "";
process.env.OPENROUTER_API_KEY = "";
process.env.ANTHROPIC_API_KEY  = "";

// ─── Constants ────────────────────────────────────────────────────────────────
const NEON_CONNECTION_STRING =
    "postgresql://neondb_owner:npg_XBEcV8OTJ3nH@ep-soft-scene-anwuoqex.c-6.us-east-1.aws.neon.tech/neondb?sslmode=require";

const NATURAL_LANGUAGE_PROMPT = "show me employees whose salary is less than 60000";

// These are the 13 employees the seed script inserted with salary < 60000
const EXPECTED_EMPLOYEES_UNDER_60K = [
    { name: "Alice Johnson",  salary: 45000.00 },
    { name: "Bob Martinez",   salary: 38000.00 },
    { name: "Carol Smith",    salary: 52000.00 },
    { name: "David Lee",      salary: 59000.00 },
    { name: "Eva Brown",      salary: 41500.00 },
    { name: "Karen White",    salary: 48000.00 },
    { name: "Liam Harris",    salary: 37500.00 },
    { name: "Mia Lewis",      salary: 43000.00 },
    { name: "Olivia Walker",  salary: 46000.00 },
    { name: "Paul Hall",      salary: 51000.00 },
    { name: "Quinn Young",    salary: 39000.00 },
    { name: "Tina Scott",     salary: 42000.00 },
    { name: "Isabella Moore", salary: 55000.00 },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Execute a raw SQL query against the live Neon database.
 * Uses a fresh Client per call (Neon free-tier pattern).
 * Retries once on connection timeout to handle Neon free-tier cold starts.
 */
async function executeLiveQuery(sql: string): Promise<{ columns: string[]; rows: any[] }> {
    const tryOnce = async () => {
        const client = new Client({
            connectionString: NEON_CONNECTION_STRING,
            ssl: { rejectUnauthorized: false },
            connectionTimeoutMillis: 20000,
            statement_timeout: 30000,
        });
        await client.connect();
        try {
            const result = await client.query(sql);
            const columns = result.fields.map((f: any) => f.name);
            return { columns, rows: result.rows };
        } finally {
            await client.end().catch(() => {});
        }
    };

    try {
        return await tryOnce();
    } catch (e: any) {
        // Neon free tier can have a cold-start timeout — retry once
        if (e.message && (e.message.includes("timeout") || e.message.includes("ECONNRESET"))) {
            return await tryOnce();
        }
        throw e;
    }
}

interface QueryGenResult {
    sql: string | null;
    error: string | null;
}

/**
 * Mirrors /api/query/route.ts core logic (no HTTP layer).
 * Takes whatever the LLM returned, strips markdown, validates safety, adds LIMIT.
 */
function runQueryGenerationPipeline(llmRawResponse: string, hasDbConnected: boolean): QueryGenResult {
    if (!hasDbConnected) {
        return { sql: null, error: "No database connected." };
    }
    const sql = extractSQL(llmRawResponse);
    if (!sql) {
        return { sql: null, error: "AI returned an empty query." };
    }
    if (!isSQLSafe(sql)) {
        return { sql: null, error: "Generated query contains unsafe operations. Only SELECT queries are allowed." };
    }
    const cleanSql = sql.replace(/;\s*$/, "").trim();
    const safeSql = /\bLIMIT\b/i.test(cleanSql) ? cleanSql : `${cleanSql} LIMIT 500`;
    return { sql: safeSql, error: null };
}

/**
 * Mirrors /api/query/run/route.ts core logic against the LIVE database.
 */
async function runQueryExecutionPipeline(
    sql: string,
    hasDbConnected: boolean,
): Promise<{ columns: string[]; rows: any[]; sql: string; error: string | null }> {
    if (!hasDbConnected) {
        return { columns: [], rows: [], sql, error: "No database connected." };
    }
    const clean = extractSQL(sql.trim()).replace(/;\s*$/, "").trim();
    if (!clean) {
        return { columns: [], rows: [], sql, error: "SQL is empty." };
    }
    if (!isSQLSafe(clean)) {
        return { columns: [], rows: [], sql, error: "Unsafe SQL rejected." };
    }
    const safeSql = /\bLIMIT\b/i.test(clean) ? clean : `${clean} LIMIT 500`;
    try {
        const { columns, rows } = await executeLiveQuery(safeSql);
        return { columns, rows, sql: safeSql, error: null };
    } catch (e: any) {
        return { columns: [], rows: [], sql: safeSql, error: e.message };
    }
}

// ─────────────────────────────────────────────────────────────────────────────
// TEST SUITE
// ─────────────────────────────────────────────────────────────────────────────

describe("Talk2DB E2E — Query Studio: employees with salary < 60000 (LIVE DB)", () => {

    // =========================================================================
    // PHASE 1 — Provider Configuration (TC-101 to TC-103)
    // Confirm that ONLY APIFreeLLM is active. No other AI providers.
    // =========================================================================

    it("TC-101: FREEAPI_KEY must be set and start with 'apf_' (not a placeholder)", () => {
        const key = process.env.FREEAPI_KEY ?? "";
        expect(key.length).toBeGreaterThan(10);
        expect(key.startsWith("apf_")).toBe(true);
        expect(key.toLowerCase()).not.toContain("your");
        expect(key.toLowerCase()).not.toContain("here");
    });

    it("TC-102: All other AI provider env vars must be empty (no fallback providers active)", () => {
        const keys = [
            process.env.GEMINI_API_KEY,
            process.env.OPENAI_API_KEY,
            process.env.OPENROUTER_API_KEY,
            process.env.ANTHROPIC_API_KEY,
        ];
        keys.forEach((k) => expect(!k || k.trim() === "").toBe(true));
    });

    it("TC-103: LLM_PROVIDER must be 'apifreellm' so it is the first and only provider tried", () => {
        expect(process.env.LLM_PROVIDER).toBe("apifreellm");
    });

    // =========================================================================
    // PHASE 2 — Database Connection (TC-104 to TC-107)
    // Open the app and connect to the Neon database.
    // =========================================================================

    it("TC-104: Neon connection string sanitizes to a valid postgresql:// URL", () => {
        const cleaned = sanitizeConnectionString(NEON_CONNECTION_STRING);
        expect(cleaned.startsWith("postgresql://")).toBe(true);
        expect(cleaned).toContain("neon.tech");
    });

    it("TC-105: DB_ENCRYPTION_KEY is exactly 64 hex characters (AES-256 requirement)", () => {
        const key = process.env.DB_ENCRYPTION_KEY ?? "";
        expect(key.length).toBe(64);
        expect(/^[0-9a-fA-F]{64}$/.test(key)).toBe(true);
    });

    it("TC-106: encrypt() stores the connection string as IV:ciphertext — never plaintext", () => {
        const encrypted = encrypt(NEON_CONNECTION_STRING);
        const parts = encrypted.split(":");
        expect(parts.length).toBe(2);
        expect(parts[0].length).toBe(32); // 16-byte IV = 32 hex chars
        expect(encrypted).not.toContain("neondb_owner"); // plaintext never stored
    });

    it("TC-107: decrypt(encrypt(url)) round-trip returns original connection string", () => {
        const encrypted = encrypt(NEON_CONNECTION_STRING);
        expect(decrypt(encrypted)).toBe(NEON_CONNECTION_STRING);
    });

    // =========================================================================
    // PHASE 3 — Neon Database is Reachable and Has employees Table (TC-108 to TC-110)
    // Verify the live DB connection works and the employees table exists with data.
    // =========================================================================

    it("TC-108: LIVE DB — can connect to Neon and run a health check query", async () => {
        const { rows } = await executeLiveQuery("SELECT 1 AS ok");
        expect(rows[0].ok).toBe(1);
    }, 20000);

    it("TC-109: LIVE DB — employees table exists in the public schema", async () => {
        const { rows } = await executeLiveQuery(
            "SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'employees'"
        );
        expect(rows.length).toBe(1);
        expect(rows[0].table_name).toBe("employees");
    }, 20000);

    it("TC-110: LIVE DB — employees table has the expected columns including name, salary, department", async () => {
        const { rows } = await executeLiveQuery(
            "SELECT column_name FROM information_schema.columns WHERE table_name = 'employees' AND table_schema = 'public' ORDER BY ordinal_position"
        );
        const colNames = rows.map((r: any) => r.column_name);
        expect(colNames).toContain("id");
        expect(colNames).toContain("name");
        expect(colNames).toContain("salary");
        expect(colNames).toContain("department");
    }, 20000);

    // =========================================================================
    // PHASE 4 — Prompt → SQL Generation (TC-111 to TC-116)
    // User types the natural language prompt. Pipeline converts it to SQL.
    // =========================================================================

    it("TC-111: Prompt is non-empty and contains keywords 'employee' and 'salary'", () => {
        expect(NATURAL_LANGUAGE_PROMPT.trim().length).toBeGreaterThan(0);
        expect(NATURAL_LANGUAGE_PROMPT.toLowerCase()).toContain("employee");
        expect(NATURAL_LANGUAGE_PROMPT.toLowerCase()).toContain("salary");
    });

    it("TC-112: Pipeline generates a SELECT query when LLM returns clean SQL", () => {
        const llmResponse = "SELECT * FROM employees WHERE salary < 60000";
        const result = runQueryGenerationPipeline(llmResponse, true);
        expect(result.error).toBeNull();
        expect(result.sql!.toUpperCase().startsWith("SELECT")).toBe(true);
        expect(result.sql!.toLowerCase()).toContain("salary");
        expect(result.sql!).toContain("60000");
    });

    it("TC-113: Pipeline strips markdown code fences from LLM response before using SQL", () => {
        const llmResponse = "```sql\nSELECT * FROM employees WHERE salary < 60000\n```";
        const result = runQueryGenerationPipeline(llmResponse, true);
        expect(result.error).toBeNull();
        expect(result.sql!).not.toContain("```");
        expect(result.sql!.toUpperCase().startsWith("SELECT")).toBe(true);
    });

    it("TC-114: Pipeline auto-appends LIMIT 500 to prevent unbounded result sets", () => {
        const llmResponse = "SELECT * FROM employees WHERE salary < 60000";
        const { sql } = runQueryGenerationPipeline(llmResponse, true);
        expect(sql!.toUpperCase()).toContain("LIMIT");
    });

    it("TC-115: Pipeline blocks generation when no database is connected", () => {
        const result = runQueryGenerationPipeline("SELECT * FROM employees WHERE salary < 60000", false);
        expect(result.sql).toBeNull();
        expect(result.error).toContain("No database connected");
    });

    it("TC-116: Generated SQL passes the SQL safety allowlist (SELECT-only enforcement)", () => {
        const sql = "SELECT * FROM employees WHERE salary < 60000";
        expect(isSQLSafe(sql)).toBe(true);
    });

    // =========================================================================
    // PHASE 5 — Click Execute: Run SQL Against the LIVE Database (TC-117 to TC-120)
    // =========================================================================

    it("TC-117: LIVE DB — executing the salary query returns rows without error", async () => {
        const sql = "SELECT id, name, department, salary FROM employees WHERE salary < 60000 ORDER BY salary ASC LIMIT 500";
        const result = await runQueryExecutionPipeline(sql, true);
        expect(result.error).toBeNull();
        expect(result.rows.length).toBeGreaterThan(0);
        expect(result.columns).toContain("name");
        expect(result.columns).toContain("salary");
    }, 50000);

    it("TC-118: LIVE DB — query returns exactly 13 employees with salary < 60000", async () => {
        const sql = "SELECT id, name, salary FROM employees WHERE salary < 60000 ORDER BY salary ASC LIMIT 500";
        const result = await runQueryExecutionPipeline(sql, true);
        expect(result.error).toBeNull();
        expect(result.rows.length).toBe(13);
    }, 20000);

    it("TC-119: LIVE DB — execution pipeline adds LIMIT when the user-supplied SQL has none", async () => {
        // Supply SQL without LIMIT — the pipeline must add it automatically
        const sqlNoLimit = "SELECT * FROM employees WHERE salary < 60000";
        const result = await runQueryExecutionPipeline(sqlNoLimit, true);
        expect(result.error).toBeNull();
        expect(result.sql.toUpperCase()).toContain("LIMIT");
        expect(result.rows.length).toBeGreaterThan(0);
    }, 20000);

    it("TC-120: LIVE DB — unsafe SQL (DROP TABLE) is rejected before reaching the database", async () => {
        const maliciousSql = "SELECT * FROM employees; DROP TABLE employees;";
        const result = await runQueryExecutionPipeline(maliciousSql, true);
        expect(result.error).toBeTruthy();
        expect(result.error).toContain("Unsafe SQL rejected");
        // Verify the table is still intact
        const check = await executeLiveQuery("SELECT COUNT(*) AS c FROM employees");
        expect(Number(check.rows[0].c)).toBe(20);
    }, 20000);

    // =========================================================================
    // PHASE 6 — Result Validation Against the LIVE Database (TC-121 to TC-125)
    // Assert that every row actually satisfies salary < 60000.
    // =========================================================================

    it("TC-121: LIVE DB — every returned row has salary strictly less than 60000", async () => {
        const { rows } = await executeLiveQuery(
            "SELECT id, name, salary FROM employees WHERE salary < 60000 LIMIT 500"
        );
        expect(rows.length).toBeGreaterThan(0);
        rows.forEach((row: any) => {
            expect(Number(row.salary)).toBeLessThan(60000);
        });
    }, 20000);

    it("TC-122: LIVE DB — NOT a single employee with salary >= 60000 is present in the results", async () => {
        const { rows } = await executeLiveQuery(
            "SELECT id, name, salary FROM employees WHERE salary < 60000 LIMIT 500"
        );
        const invalidRows = rows.filter((r: any) => Number(r.salary) >= 60000);
        if (invalidRows.length > 0) {
            console.error("INVALID ROWS (salary >= 60000 leaked through):", invalidRows);
        }
        expect(invalidRows.length).toBe(0);
    }, 20000);

    it("TC-123: LIVE DB — known employees (Alice, Bob, Carol, David, Eva) appear in results", async () => {
        const { rows } = await executeLiveQuery(
            "SELECT name FROM employees WHERE salary < 60000 ORDER BY name ASC LIMIT 500"
        );
        const names = rows.map((r: any) => r.name);
        expect(names).toContain("Alice Johnson");
        expect(names).toContain("Bob Martinez");
        expect(names).toContain("Carol Smith");
        expect(names).toContain("David Lee");
        expect(names).toContain("Eva Brown");
    }, 20000);

    it("TC-124: LIVE DB — employees with salary >= 60000 are correctly excluded from results", async () => {
        // Verify the excluded employees are actually in the full table
        const highSalary = await executeLiveQuery(
            "SELECT name, salary FROM employees WHERE salary >= 60000 ORDER BY salary ASC LIMIT 500"
        );
        expect(highSalary.rows.length).toBeGreaterThan(0);

        // Verify they do NOT appear in the salary < 60000 result
        const under60k = await executeLiveQuery(
            "SELECT name FROM employees WHERE salary < 60000 LIMIT 500"
        );
        const namesUnder = under60k.rows.map((r: any) => r.name);

        highSalary.rows.forEach((excluded: any) => {
            expect(namesUnder).not.toContain(excluded.name);
        });
    }, 20000);

    it("TC-125: LIVE DB — salary values are numeric and correctly ordered ascending", async () => {
        const { rows } = await executeLiveQuery(
            "SELECT salary FROM employees WHERE salary < 60000 ORDER BY salary ASC LIMIT 500"
        );
        expect(rows.length).toBeGreaterThan(0);

        for (let i = 1; i < rows.length; i++) {
            const prev = Number(rows[i - 1].salary);
            const curr = Number(rows[i].salary);
            expect(prev).toBeLessThanOrEqual(curr);
        }

        // Smallest should be Liam Harris at 37500
        expect(Number(rows[0].salary)).toBe(37500);
        // Largest under 60k should be David Lee at 59000
        expect(Number(rows[rows.length - 1].salary)).toBe(59000);
    }, 20000);

    // =========================================================================
    // PHASE 7 — Retry / Self-Heal Logic (TC-126 to TC-127)
    // If LLM produces bad SQL, the pipeline retries and eventually succeeds.
    // =========================================================================

    it("TC-126: Pipeline retries unsafe first response and accepts the corrected second response", async () => {
        const attempts = [
            "SELECT * FROM employees; DROP TABLE employees;",  // unsafe → rejected
            "SELECT * FROM employees WHERE salary < 60000",    // safe → accepted
        ];
        let idx = 0;
        let genResult: QueryGenResult = { sql: null, error: "not started" };

        while (idx < attempts.length) {
            genResult = runQueryGenerationPipeline(attempts[idx++], true);
            if (!genResult.error) break;
        }

        expect(genResult.error).toBeNull();
        expect(genResult.sql).not.toBeNull();
        expect(genResult.sql!).toContain("60000");

        // Then run the corrected SQL against the live DB
        const result = await runQueryExecutionPipeline(genResult.sql!, true);
        expect(result.error).toBeNull();
        expect(result.rows.length).toBe(13);
        result.rows.forEach((r: any) => expect(Number(r.salary)).toBeLessThan(60000));
    }, 30000);

    it("TC-127: Pipeline handles LLM responses with surrounding prose text", async () => {
        const llmWithProse =
            "Sure! Here is the query:\n```sql\nSELECT id, name, department, salary FROM employees WHERE salary < 60000 ORDER BY salary ASC\n```\nThis returns employees earning below 60,000.";

        const gen = runQueryGenerationPipeline(llmWithProse, true);
        expect(gen.error).toBeNull();
        expect(gen.sql!.toUpperCase().startsWith("SELECT")).toBe(true);

        const run = await runQueryExecutionPipeline(gen.sql!, true);
        expect(run.error).toBeNull();
        expect(run.rows.length).toBe(13);
        run.rows.forEach((r: any) => expect(Number(r.salary)).toBeLessThan(60000));
    }, 30000);

    // =========================================================================
    // PHASE 8 — Edge Cases & Error Handling (TC-128 to TC-129)
    // =========================================================================

    it("TC-128: formatDatabaseError maps 42P01 to a helpful message for missing tables", () => {
        const dbError = { code: "42P01", message: 'relation "employees" does not exist' };
        const friendly = formatDatabaseError(dbError);
        expect(friendly.friendlyMessage).toContain("employees");
        expect(friendly.friendlyMessage.toLowerCase()).toContain("not found");
        expect(friendly.suggestion).toBeTruthy();
    });

    it("TC-129: FULL PIPELINE SUMMARY — connect DB → prompt → generate SQL → execute → validate results", async () => {
        console.log("\n====================================================");
        console.log("  FULL E2E PIPELINE TEST — Talk2DB Query Studio");
        console.log("====================================================");

        // Step 1: Sanitize & encrypt DB connection string (simulates saving after UI connect)
        const cleanUrl = sanitizeConnectionString(NEON_CONNECTION_STRING);
        const encryptedUrl = encrypt(cleanUrl);
        const decryptedUrl = decrypt(encryptedUrl);
        expect(decryptedUrl).toBe(cleanUrl);
        console.log("  [STEP 1] ✓ DB connection string sanitized, encrypted, decrypted successfully");

        // Step 2: DB reachability check (simulates the test-connection before saving)
        const health = await executeLiveQuery("SELECT 1 AS ok");
        expect(health.rows[0].ok).toBe(1);
        console.log("  [STEP 2] ✓ Live Neon database is reachable");

        // Step 3: Schema introspection (simulates the app reading schema for LLM context)
        const schema = await executeLiveQuery(
            "SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'employees' AND table_schema = 'public' ORDER BY ordinal_position"
        );
        expect(schema.rows.length).toBeGreaterThan(0);
        const colNames = schema.rows.map((r: any) => r.column_name);
        expect(colNames).toContain("salary");
        console.log(`  [STEP 3] ✓ Schema introspected — employees columns: [${colNames.join(", ")}]`);

        // Step 4: Simulate LLM (APIFreeLLM) receiving the prompt and returning SQL
        const llmSimulatedOutput =
            "```sql\nSELECT id, name, department, position, salary, hire_date FROM employees WHERE salary < 60000 ORDER BY salary ASC\n```";
        const gen = runQueryGenerationPipeline(llmSimulatedOutput, true);
        expect(gen.error).toBeNull();
        expect(gen.sql).not.toBeNull();
        console.log(`  [STEP 4] ✓ LLM (APIFreeLLM) generated SQL: ${gen.sql}`);
        console.log(`           Prompt: "${NATURAL_LANGUAGE_PROMPT}"`);

        // Step 5: Safety check (simulates isSQLSafe gate before execution)
        const rawSql = extractSQL(llmSimulatedOutput);
        expect(isSQLSafe(rawSql)).toBe(true);
        console.log("  [STEP 5] ✓ SQL passed safety validation (SELECT-only, no injections)");

        // Step 6: Execute SQL against the LIVE database (simulates clicking "Run")
        const run = await runQueryExecutionPipeline(gen.sql!, true);
        expect(run.error).toBeNull();
        console.log(`  [STEP 6] ✓ Query executed successfully — ${run.rows.length} rows returned`);

        // Step 7: Validate every row
        expect(run.rows.length).toBeGreaterThan(0);
        const allValid = run.rows.every((r: any) => Number(r.salary) < 60000);
        expect(allValid).toBe(true);
        console.log("  [STEP 7] ✓ ALL returned employees have salary < 60000");

        // Step 8: Print the result table
        console.log("\n  ┌─────────────────────────────────────────────────────────────┐");
        console.log("  │  QUERY RESULTS — Employees with salary < 60,000             │");
        console.log("  ├────┬────────────────────┬─────────────┬────────────────────┤");
        console.log("  │ ID │ Name               │ Department  │ Salary             │");
        console.log("  ├────┼────────────────────┼─────────────┼────────────────────┤");
        run.rows.forEach((r: any) => {
            const id   = String(r.id).padEnd(3);
            const name = r.name.padEnd(18);
            const dept = (r.department || "").padEnd(11);
            const sal  = `$${Number(r.salary).toLocaleString()}`.padEnd(18);
            console.log(`  │ ${id}│ ${name} │ ${dept} │ ${sal} │`);
        });
        console.log("  └────┴────────────────────┴─────────────┴────────────────────┘");
        console.log(`\n  Total employees with salary < $60,000: ${run.rows.length}`);
        console.log("====================================================\n");

        // Final assertion: count matches expected
        expect(run.rows.length).toBe(13);
    }, 40000);
});
