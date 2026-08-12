import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { callLLM } from "@/lib/llm";
import { isSQLSafe, extractSQL } from "@/lib/sqlSafety";
import { rateLimit, getIdentifier, RATE_LIMITS } from "@/lib/rateLimit";
import { resolveUserWithDb } from "@/lib/resolveUser";
import { checkPromptGuardrail } from "@/lib/promptGuardrail";
import { getEnrichedSchema, formatSchemaForLLM, buildSQLSystemPrompt } from "@/lib/schemaContext";

export const maxDuration = 120;

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

        const { prompt, previousSql, previousPrompt } = await req.json();
        if (!prompt?.trim()) {
            return NextResponse.json({ error: "Prompt is required" }, { status: 400 });
        }

        // Guardrail — reject off-topic prompts before spending LLM tokens
        const guard = checkPromptGuardrail(prompt);
        if (!guard.allowed) {
            return NextResponse.json({ error: guard.reason }, { status: 400 });
        }

        const user = await resolveUserWithDb(session);
        if (!user?.dbConnectionString) {
            return NextResponse.json({
                error: "No database connected. Click 'Not Connected' in the top bar to connect your database.",
            }, { status: 400 });
        }

        const dialect = user.dbDialect || "postgresql";

        // ── Enriched schema: tables + columns + PKs + FKs + sample values ─────
        const schema = await getEnrichedSchema(user.dbConnectionString);
        const schemaText = formatSchemaForLLM(schema);
        const systemPrompt = buildSQLSystemPrompt(dialect, schemaText);

        // ── Build user message with optional previous query context ───────────
        let userMessage = "";
        if (previousSql) {
            userMessage += `Previous Request: ${previousPrompt || "N/A"}\nPrevious Query:\n${previousSql}\n\n`;
        }
        userMessage += schemaText
            ? `New Request: ${prompt}\n\nGenerate the SQL query using ONLY the exact table and column names from the schema. Use JOINs where the request spans multiple tables.`
            : `New Request: ${prompt}\n\nGenerate the SQL query.`;

        // ── Call LLM ──────────────────────────────────────────────────────────
        let rawSQL: string;
        try {
            rawSQL = await callLLM(systemPrompt, userMessage, {
                userId: user.id,
                source: "query",
            });
        } catch (e: any) {
            if (process.env.NODE_ENV !== "production") console.error("LLM call failed:", e);
            return NextResponse.json({
                error: e.message || "AI service unavailable. Please try again.",
            }, { status: 503 });
        }

        const sql = extractSQL(rawSQL);
        if (!sql) {
            return NextResponse.json({
                error: "AI returned an empty query. Try rephrasing your request.",
            }, { status: 400 });
        }
        if (!isSQLSafe(sql)) {
            return NextResponse.json({
                error: "Generated query contains unsafe operations. Only SELECT queries are allowed.",
            }, { status: 400 });
        }

        const cleanSql = sql.replace(/;\s*$/, "").trim();
        // Don't add LIMIT for aggregate queries (they return few rows anyway)
        const isAggregate = /\b(GROUP\s+BY|HAVING|COUNT|SUM|AVG|MAX|MIN|DISTINCT)\b/i.test(cleanSql);
        const safeSql = isAggregate || /\bLIMIT\b/i.test(cleanSql)
            ? cleanSql
            : `${cleanSql} LIMIT 500`;

        return NextResponse.json({ sql: safeSql });
    } catch (error: any) {
        if (process.env.NODE_ENV !== "production") console.error("Query route error:", error);
        return NextResponse.json({
            error: error.message || "Query generation failed",
        }, { status: 500 });
    }
}
