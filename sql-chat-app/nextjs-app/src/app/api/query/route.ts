import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { callLLM } from "@/lib/llm";
import { executeQuery } from "@/lib/dbConnection";
import { isSQLSafe, extractSQL } from "@/lib/sqlSafety";
import { rateLimit, getIdentifier, RATE_LIMITS } from "@/lib/rateLimit";
import { resolveUserWithDb } from "@/lib/resolveUser";

// Allow up to 120s for the APIFreeLLM free-tier response
export const maxDuration = 120;

async function getSchemaContext(encryptedUrl: string): Promise<string> {
    try {
        // Use executeQuery (which handles Neon fresh-client strategy) for schema introspection
        const tablesResult = await executeQuery(
            encryptedUrl,
            `SELECT table_name FROM information_schema.tables
             WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
             ORDER BY table_name`
        );

        const tableNames = tablesResult.rows.map((r: any) => r.table_name as string);

        const tables = await Promise.all(
            tableNames.map(async (tableName) => {
                const colResult = await executeQuery(
                    encryptedUrl,
                    `SELECT column_name, data_type FROM information_schema.columns
                     WHERE table_name = '${tableName.replace(/'/g, "''")}' AND table_schema = 'public'
                     ORDER BY ordinal_position`
                );
                const cols = colResult.rows.map((c: any) => `${c.column_name} (${c.data_type})`).join(", ");
                return `Table: ${tableName}\nColumns: ${cols}`;
            })
        );

        return tables.join("\n\n");
    } catch {
        return "";
    }
}

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

        const { prompt } = await req.json();
        if (!prompt?.trim()) {
            return NextResponse.json({ error: "Prompt is required" }, { status: 400 });
        }

        const user = await resolveUserWithDb(session);
        if (!user?.dbConnectionString) {
            return NextResponse.json({
                error: "No database connected. Click 'Not Connected' in the top bar to connect your database."
            }, { status: 400 });
        }

        const dialect = user.dbDialect || "postgresql";
        const schemaContext = await getSchemaContext(user.dbConnectionString);

        const dialectInstructions: Record<string, string> = {
            postgresql: "Generate a syntactically correct PostgreSQL SELECT query. Use double-quoted identifiers for names with spaces.",
            mysql:      "Generate a syntactically correct MySQL SELECT query. Use backtick-quoted identifiers. Do NOT use PostgreSQL-specific functions.",
            sqlite:     "Generate a syntactically correct SQLite SELECT query. Avoid ARRAY_AGG and DATE_TRUNC — use strftime instead.",
        };
        const dialectHint = dialectInstructions[dialect] ?? dialectInstructions.postgresql;

        const systemPrompt = `You are a ${dialect.toUpperCase()} SQL expert. ${dialectHint}
Return ONLY the raw SQL SELECT query text with NO markdown code blocks, NO comments, NO explanation.
Just the pure SQL query on one or multiple lines.`;

        const userMessage = schemaContext
            ? `Database Schema:\n${schemaContext}\n\nUser Request: ${prompt}\n\nGenerate SQL SELECT query.`
            : `User Request: ${prompt}\n\nGenerate SQL SELECT query.`;

        let rawSQL: string;
        try {
            rawSQL = await callLLM(systemPrompt, userMessage);
        } catch (e: any) {
            if (process.env.NODE_ENV !== "production") {
                console.error("LLM call failed:", e);
            }
            return NextResponse.json({
                error: e.message || "AI service unavailable. Please set OPENROUTER_API_KEY in your .env file."
            }, { status: 503 });
        }

        const sql = extractSQL(rawSQL);
        if (!sql) {
            return NextResponse.json({
                error: "AI returned an empty query. Try rephrasing your request."
            }, { status: 400 });
        }
        if (!isSQLSafe(sql)) {
            return NextResponse.json({
                error: "Generated query contains unsafe operations. Only SELECT queries are allowed."
            }, { status: 400 });
        }

        // FIX: strip trailing semicolon before appending LIMIT so we don't
        // produce "SELECT ... FROM t; LIMIT 500" which is a syntax error.
        const cleanSql = sql.replace(/;\s*$/, "").trim();
        const safeSql = /\bLIMIT\b/i.test(cleanSql) ? cleanSql : `${cleanSql} LIMIT 500`;

        // Return the generated SQL without executing it — the client now
        // shows it in an editable box and fires a separate /api/query/run request.
        return NextResponse.json({ sql: safeSql });
    } catch (error: any) {
        if (process.env.NODE_ENV !== "production") {
            console.error("Query route error:", error);
        }
        return NextResponse.json({
            error: error.message || "Query generation failed"
        }, { status: 500 });
    }
}
