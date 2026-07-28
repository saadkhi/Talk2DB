import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { executeQuery } from "@/lib/dbConnection";
import { isSQLSafe, extractSQL } from "@/lib/sqlSafety";
import { rateLimit, getIdentifier, RATE_LIMITS } from "@/lib/rateLimit";
import { resolveUserWithDb } from "@/lib/resolveUser";

/**
 * POST /api/query/run
 * Executes a user-supplied (possibly hand-edited) SQL query against the
 * user's connected database. No LLM call — this is a pure execution endpoint.
 *
 * Body: { sql: string }
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

        // Strip trailing semicolon before safety check and execution
        const cleanSql = sql.replace(/;\s*$/, "").trim();

        if (!cleanSql) {
            return NextResponse.json({ error: "SQL is empty after parsing." }, { status: 400 });
        }

        if (!isSQLSafe(cleanSql)) {
            return NextResponse.json({
                error: "Query contains unsafe operations. Only SELECT queries are allowed."
            }, { status: 400 });
        }

        // Append LIMIT if the user removed it — protect against huge result sets
        const safeSql = /\bLIMIT\b/i.test(cleanSql) ? cleanSql : `${cleanSql} LIMIT 500`;

        try {
            const { columns, rows } = await executeQuery(user.dbConnectionString, safeSql);
            return NextResponse.json({ sql: safeSql, columns, rows });
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
