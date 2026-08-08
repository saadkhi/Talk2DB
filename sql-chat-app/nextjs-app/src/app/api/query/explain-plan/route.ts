import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { callLLM } from "@/lib/llm";
import { executeQuery } from "@/lib/dbConnection";
import { rateLimit, getIdentifier, RATE_LIMITS } from "@/lib/rateLimit";
import { resolveUserWithDb } from "@/lib/resolveUser";

export const maxDuration = 120;

export async function POST(req: Request) {
    const identifier = getIdentifier(req);
    const rl = rateLimit(identifier, RATE_LIMITS.query.limit, RATE_LIMITS.query.windowMs);
    if (!rl.success) {
        return NextResponse.json({ error: "Rate limit exceeded" }, { status: 429 });
    }

    try {
        const session = await getServerSession(authOptions);
        if (!session?.user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { sql } = await req.json();
        
        if (!sql) {
            return NextResponse.json({ error: "Missing sql" }, { status: 400 });
        }

        const user = await resolveUserWithDb(session);
        if (!user?.dbConnectionString) {
            return NextResponse.json({ error: "No database connected." }, { status: 400 });
        }

        // Run EXPLAIN on the SQL
        // Some dialects might need different EXPLAIN syntax, but EXPLAIN works for Postgres, MySQL, and SQLite.
        const explainQuery = `EXPLAIN ${sql}`;
        let explainPlan = "";
        
        try {
            const result = await executeQuery(user.dbConnectionString, explainQuery);
            // Result rows will usually contain a single column like 'QUERY PLAN' or multiple columns
            explainPlan = JSON.stringify(result.rows, null, 2);
        } catch (e: any) {
            console.error("EXPLAIN failed:", e);
            return NextResponse.json({ error: `Could not EXPLAIN query: ${e.message}` }, { status: 400 });
        }

        const systemPrompt = `You are an expert Database Administrator.
Your task is to take the output of a SQL EXPLAIN command and translate it into a concise, easy-to-understand summary.
Highlight the main operations (e.g., sequential scans, index scans, joins) and point out any potential performance bottlenecks if obvious.
Do not overwhelm the user with jargon. Keep it under 5 sentences.`;

        const userMessage = `SQL Query:\n${sql}\n\nEXPLAIN Output:\n${explainPlan}\n\nPlease summarize this query execution plan.`;

        const summary = await callLLM(systemPrompt, userMessage);

        return NextResponse.json({ plan: explainPlan, summary });
    } catch (error: any) {
        if (process.env.NODE_ENV !== "production") {
            console.error("Explain plan error:", error);
        }
        return NextResponse.json({
            error: error.message || "Failed to explain query plan"
        }, { status: 500 });
    }
}
