import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { callLLM } from "@/lib/llm";
import { executeQuery } from "@/lib/dbConnection";
import { rateLimit, getIdentifier, RATE_LIMITS } from "@/lib/rateLimit";
import { resolveUserWithDb } from "@/lib/resolveUser";

export const maxDuration = 120;

async function getSchemaContext(encryptedUrl: string): Promise<string> {
    try {
        const tablesResult = await executeQuery(
            encryptedUrl,
            `SELECT table_name FROM information_schema.tables
             WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
             ORDER BY table_name`
        );
        const tableNames = tablesResult.rows.map((r: any) => r.table_name as string);
        const tables = await Promise.all(
            tableNames.map(async (tableName) => {
                const safeTable = tableName.replace(/'/g, "''");
                const colResult = await executeQuery(
                    encryptedUrl,
                    `SELECT column_name, data_type FROM information_schema.columns
                     WHERE table_name = '${safeTable}' AND table_schema = 'public'
                     ORDER BY ordinal_position`
                );
                const cols = colResult.rows.map((c: any) => `${c.column_name}: ${c.data_type}`).join(", ");
                return `Table: "${tableName}" - Columns: ${cols}`;
            })
        );
        return tables.join("\n");
    } catch {
        return "";
    }
}

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

        const schemaContext = await getSchemaContext(user.dbConnectionString);

        const systemPrompt = `You are a helpful data analyst. Given a SQL query that a user just ran, suggest 3 logical follow-up questions they might want to ask next to dig deeper into the data.
The questions should be natural language (e.g. "What is the average revenue per month?").
Return ONLY a JSON array of 3 strings. Example: ["question 1", "question 2", "question 3"].
Do not include markdown blocks, just the raw JSON array.`;

        let userMessage = `Current SQL Query:\n${sql}\n\n`;
        if (schemaContext) {
            userMessage += `Database Schema (for context):\n${schemaContext}\n\n`;
        }
        userMessage += `Please suggest 3 follow-up questions as a JSON array.`;

        const rawResponse = await callLLM(systemPrompt, userMessage);
        
        let suggestions: string[] = [];
        try {
            // strip markdown formatting if any
            const cleaned = rawResponse.replace(/```json\s*/i, "").replace(/```\s*/, "").trim();
            suggestions = JSON.parse(cleaned);
            if (!Array.isArray(suggestions)) throw new Error("Not an array");
        } catch (e) {
            console.error("Failed to parse follow-ups", rawResponse);
            suggestions = ["What are the top 5 records?", "How does this compare by category?", "Show this data over time."];
        }

        return NextResponse.json({ suggestions: suggestions.slice(0, 3) });
    } catch (error: any) {
        if (process.env.NODE_ENV !== "production") {
            console.error("Suggest followups error:", error);
        }
        return NextResponse.json({
            error: error.message || "Failed to suggest followups"
        }, { status: 500 });
    }
}
