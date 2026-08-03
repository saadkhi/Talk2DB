import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { executeQuery } from "@/lib/dbConnection";
import { isSQLSafe, extractSQL } from "@/lib/sqlSafety";
import { rateLimit, getIdentifier, RATE_LIMITS } from "@/lib/rateLimit";
import { resolveUserWithDb } from "@/lib/resolveUser";

// ─── Guardrail types ──────────────────────────────────────────────────────────

export interface ColumnHint {
    column: string;
    queriedValue: string;
    /** Up to 10 actual distinct values from that column */
    actualValues: string[];
    /** Fuzzy-matched suggestions (levenshtein-ish) */
    suggestions: string[];
}

export interface QueryGuardrail {
    type: "no_results" | "value_mismatch" | "column_not_found";
    message: string;
    hints: ColumnHint[];
}

// ─── Simple string similarity (trigram overlap) ───────────────────────────────

function normalize(s: string) {
    return s.toLowerCase().trim();
}

function trigrams(s: string): Set<string> {
    const n = normalize(s);
    const set = new Set<string>();
    for (let i = 0; i < n.length - 1; i++) set.add(n.slice(i, i + 2));
    return set;
}

function similarity(a: string, b: string): number {
    const ta = trigrams(a);
    const tb = trigrams(b);
    if (ta.size === 0 && tb.size === 0) return 1;
    if (ta.size === 0 || tb.size === 0) return 0;
    let shared = 0;
    for (const t of ta) if (tb.has(t)) shared++;
    return (2 * shared) / (ta.size + tb.size);
}

/** Return values from `candidates` that are "close enough" to `target` */
function fuzzyMatch(target: string, candidates: string[], threshold = 0.25): string[] {
    return candidates
        .map(c => ({ c, score: similarity(target, c) }))
        .filter(({ score }) => score >= threshold)
        .sort((a, b) => b.score - a.score)
        .slice(0, 5)
        .map(({ c }) => c);
}

// ─── Extract WHERE string literals from SQL ───────────────────────────────────

interface WhereClause {
    column: string;
    value: string;
}

/**
 * Very lightweight WHERE-clause parser.
 * Handles patterns like:
 *   col = 'val'  |  col LIKE '%val%'  |  col ILIKE 'val'  |  col IN ('a','b')
 * Returns list of {column, value} pairs for string literals only.
 */
function extractWhereClauses(sql: string): WhereClause[] {
    const results: WhereClause[] = [];

    // Match: identifier = 'value'  or  identifier LIKE/ILIKE 'value'
    const eqPattern = /\b([\w"]+)\s*(?:=|LIKE|ILIKE)\s*'([^']+)'/gi;
    let m: RegExpExecArray | null;
    while ((m = eqPattern.exec(sql)) !== null) {
        results.push({
            column: m[1].replace(/"/g, ""),
            value: m[2],
        });
    }

    // Match: identifier IN ('a', 'b', 'c')
    const inPattern = /\b([\w"]+)\s+IN\s*\(([^)]+)\)/gi;
    while ((m = inPattern.exec(sql)) !== null) {
        const col = m[1].replace(/"/g, "");
        const vals = m[2].match(/'([^']+)'/g) ?? [];
        for (const v of vals) {
            results.push({ column: col, value: v.slice(1, -1) });
        }
    }

    return results;
}

/** Extract the table name from a simple SELECT … FROM "table" or FROM table query */
function extractTableName(sql: string): string | null {
    const m = sql.match(/\bFROM\s+"?(\w+)"?/i);
    return m ? m[1] : null;
}

// ─── Build guardrail after 0-row result ───────────────────────────────────────

async function buildGuardrail(
    sql: string,
    encryptedUrl: string
): Promise<QueryGuardrail | null> {
    const whereClauses = extractWhereClauses(sql);
    if (whereClauses.length === 0) return null;

    const tableName = extractTableName(sql);
    if (!tableName) return null;

    const hints: ColumnHint[] = [];

    for (const { column, value } of whereClauses) {
        try {
            // Fetch up to 50 distinct values from that column
            const safeTable = tableName.replace(/"/g, '""');
            const safeCol = column.replace(/"/g, '""');

            const result = await executeQuery(
                encryptedUrl,
                `SELECT DISTINCT "${safeCol}"::text AS val
                 FROM "${safeTable}"
                 WHERE "${safeCol}" IS NOT NULL
                 ORDER BY "${safeCol}"
                 LIMIT 50`
            );

            const actualValues = result.rows.map((r: any) => String(r.val));
            const suggestions = fuzzyMatch(value, actualValues);

            // Only emit a hint if the queried value isn't in the actual values
            const exact = actualValues.some(
                v => normalize(v) === normalize(value)
            );
            if (!exact) {
                hints.push({ column, queriedValue: value, actualValues: actualValues.slice(0, 10), suggestions });
            }
        } catch {
            // Column may not be text-castable — skip silently
        }
    }

    if (hints.length === 0) return null;

    // Build a human-readable message
    const parts = hints.map(h => {
        if (h.suggestions.length > 0) {
            return `"${h.column}" column has no value '${h.queriedValue}' — did you mean: ${h.suggestions.map(s => `'${s}'`).join(", ")}?`;
        }
        const sample = h.actualValues.slice(0, 5).map(v => `'${v}'`).join(", ");
        return `"${h.column}" column has no value '${h.queriedValue}'. Actual values include: ${sample || "none found"}.`;
    });

    return {
        type: "value_mismatch",
        message: parts.join(" "),
        hints,
    };
}

// ─── Route handler ────────────────────────────────────────────────────────────

/**
 * POST /api/query/run
 * Executes a user-supplied (possibly hand-edited) SQL query against the
 * user's connected database. No LLM call — this is a pure execution endpoint.
 *
 * Body: { sql: string }
 * Response: { sql, columns, rows, guardrail? }
 */
export async function POST(req: Request) {
    const identifier = getIdentifier(req);
    const rl = rateLimit(identifier, RATE_LIMITS.query.limit, RATE_LIMITS.query.windowMs);
    if (!rl.success) {
        return NextResponse.json({ error: "Rate limit exceeded" }, {
            status: 429,
            headers: {
                "X-RateLimit-Limit": rl.limit.toString(),
                "X-RateLimit-Remaining": rl.remaining.toString(),
                "X-RateLimit-Reset": rl.resetTime.toString(),
            },
        });
    }

    try {
        const session = await getServerSession(authOptions);
        if (!session?.user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { sql: rawSql } = await req.json();
        if (!rawSql?.trim()) {
            return NextResponse.json({ error: "SQL is required" }, { status: 400 });
        }

        const user = await resolveUserWithDb(session);
        if (!user?.dbConnectionString) {
            return NextResponse.json({
                error: "No database connected. Connect your database first."
            }, { status: 400 });
        }

        // Extract from markdown blocks if the user pasted wrapped SQL
        const sql = extractSQL(rawSql.trim());
        const cleanSql = sql.replace(/;\s*$/, "").trim();

        if (!cleanSql) {
            return NextResponse.json({ error: "SQL is empty after parsing." }, { status: 400 });
        }

        if (!isSQLSafe(cleanSql)) {
            return NextResponse.json({
                error: "Query contains unsafe operations. Only SELECT queries are allowed."
            }, { status: 400 });
        }

        const safeSql = /\bLIMIT\b/i.test(cleanSql) ? cleanSql : `${cleanSql} LIMIT 500`;

        try {
            const { columns, rows } = await executeQuery(user.dbConnectionString, safeSql);

            // ── Guardrail: zero results with WHERE filters ────────────────────
            let guardrail: QueryGuardrail | null = null;
            if (rows.length === 0 && /\bWHERE\b/i.test(safeSql)) {
                guardrail = await buildGuardrail(safeSql, user.dbConnectionString);
            }

            return NextResponse.json({ sql: safeSql, columns, rows, guardrail });
        } catch (dbError: any) {
            return NextResponse.json({ error: dbError.message, sql: safeSql }, { status: 422 });
        }
    } catch (error: any) {
        if (process.env.NODE_ENV !== "production") {
            console.error("Query run error:", error);
        }
        return NextResponse.json({
            error: error.message || "Query execution failed"
        }, { status: 500 });
    }
}
