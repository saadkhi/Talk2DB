import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { callLLM } from "@/lib/llm";
import { rateLimit, getIdentifier, RATE_LIMITS } from "@/lib/rateLimit";

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

        const { sql, prompt, rows } = await req.json();
        
        if (!sql || !rows) {
            return NextResponse.json({ error: "Missing sql or rows" }, { status: 400 });
        }

        const systemPrompt = `You are a data analyst assistant. Your job is to provide a brief, plain-English summary of what a SQL query result means.
Keep it extremely concise (1-3 sentences max). Do not explain the SQL syntax, just tell the user what the data represents and highlight any obvious takeaway from the sample rows provided.`;

        let userMessage = `SQL Query:\n${sql}\n\n`;
        if (prompt) {
            userMessage += `User's Original Request: ${prompt}\n\n`;
        }
        userMessage += `Sample Result Rows (up to 5):\n${JSON.stringify(rows.slice(0, 5), null, 2)}\n\n`;
        userMessage += `Please explain these results in plain English.`;

        const explanation = await callLLM(systemPrompt, userMessage);

        return NextResponse.json({ explanation });
    } catch (error: any) {
        if (process.env.NODE_ENV !== "production") {
            console.error("Explain result error:", error);
        }
        return NextResponse.json({
            error: error.message || "Failed to explain results"
        }, { status: 500 });
    }
}
