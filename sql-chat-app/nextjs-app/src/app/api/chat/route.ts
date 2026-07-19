import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { callLLM } from "@/lib/llm";
import { getUserDbPool } from "@/lib/dbConnection";
import { resolveUserWithDb } from "@/lib/resolveUser";
import { rateLimit, getIdentifier, RATE_LIMITS } from "@/lib/rateLimit";

const SYSTEM_PROMPT = `You are Talk2DB, an expert database assistant. You help users interact with their PostgreSQL database using plain English.

Your capabilities:
- Translate natural language questions into accurate PostgreSQL SELECT queries
- Explain query results in plain English
- Help users understand their database schema and relationships
- Suggest follow-up queries to explore data further
- Explain SQL concepts clearly when asked

Rules:
1. When a user asks a data question, generate a SQL query AND explain what it does
2. Format SQL queries in a markdown code block (\`\`\`sql ... \`\`\`)
3. If a database schema is provided, use the EXACT table and column names from that schema
4. Only generate SELECT queries — never INSERT, UPDATE, DELETE, DROP, or mutating SQL
5. Keep responses concise — lead with the SQL, then a brief explanation
6. If the user asks something unrelated to databases or SQL, politely redirect them`;

async function getSchemaContext(encryptedConnString: string): Promise<string> {
    try {
        const pool = await getUserDbPool(encryptedConnString);
        const tablesResult = await pool.query(`
            SELECT table_name
            FROM information_schema.tables
            WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
            ORDER BY table_name
        `);

        const tables = await Promise.all(
            tablesResult.rows.map(async (row: any) => {
                const colResult = await pool.query(
                    `SELECT column_name, data_type
                     FROM information_schema.columns
                     WHERE table_name = $1 AND table_schema = 'public'
                     ORDER BY ordinal_position`,
                    [row.table_name]
                );
                const cols = colResult.rows
                    .map((c: any) => `${c.column_name} (${c.data_type})`)
                    .join(", ");
                return `Table: ${row.table_name}\nColumns: ${cols}`;
            })
        );

        return tables.join("\n\n");
    } catch {
        return "";
    }
}

export async function POST(req: Request) {
    // Rate limiting
    const identifier = getIdentifier(req);
    const rl = rateLimit(identifier, RATE_LIMITS.chat.limit, RATE_LIMITS.chat.windowMs);
    if (!rl.success) {
        return NextResponse.json({ error: "Rate limit exceeded" }, { status: 429 });
    }

    try {
        const session = await getServerSession(authOptions);
        if (!session?.user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { message: userMessage, conversation_id } = await req.json();
        if (!userMessage?.trim()) {
            return NextResponse.json({ error: "Message cannot be empty" }, { status: 400 });
        }

        // Resolve user with DB connection
        const user = await resolveUserWithDb(session);

        // Build schema-aware system prompt
        let systemPrompt = SYSTEM_PROMPT;
        if (user?.dbConnectionString) {
            const schemaContext = await getSchemaContext(user.dbConnectionString);
            if (schemaContext) {
                systemPrompt = `${SYSTEM_PROMPT}\n\nDATABASE SCHEMA (use these exact names):\n${schemaContext}`;
            }
        } else {
            systemPrompt = `${SYSTEM_PROMPT}\n\nNote: No database connected yet. You can explain SQL concepts and help craft queries, but cannot run them against a live database.`;
        }

        const userId = user?.id;

        // Conversation persistence (only for authenticated users with a DB row)
        let conversation: { id: string; title: string } | null = null;

        if (userId) {
            if (conversation_id) {
                conversation = await prisma.conversation.findUnique({
                    where: { id: conversation_id, userId },
                });
                if (!conversation) {
                    return NextResponse.json({ error: "Conversation not found" }, { status: 404 });
                }
            } else {
                conversation = await prisma.conversation.create({
                    data: { userId, title: userMessage.slice(0, 50) },
                });
            }

            await prisma.message.create({
                data: { conversationId: conversation.id, role: "user", content: userMessage },
            });
        }

        // Generate AI response using FreeAPILLM → OpenRouter fallback
        let responseText: string;
        try {
            responseText = await callLLM(systemPrompt, userMessage);
        } catch (e: any) {
            if (process.env.NODE_ENV !== "production") {
                console.error("LLM call failed:", e);
            }
            return NextResponse.json(
                { error: "AI service temporarily unavailable. Please try again." },
                { status: 503 }
            );
        }

        // Persist assistant reply
        if (userId && conversation) {
            await prisma.message.create({
                data: { conversationId: conversation.id, role: "assistant", content: responseText },
            });
            await prisma.conversation.update({
                where: { id: conversation.id },
                data: { updatedAt: new Date() },
            });
        }

        return NextResponse.json({
            response: responseText,
            conversation_id: conversation?.id ?? null,
            title: conversation?.title ?? null,
        });
    } catch (error: any) {
        if (process.env.NODE_ENV !== "production") {
            console.error("Chat route error:", error);
        }
        return NextResponse.json(
            { error: error.message || "Failed to generate response" },
            { status: 500 }
        );
    }
}
