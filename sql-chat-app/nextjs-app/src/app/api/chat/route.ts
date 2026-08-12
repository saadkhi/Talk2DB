import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { callLLM } from "@/lib/llm";
import { resolveUserWithDb } from "@/lib/resolveUser";
import { rateLimit, getIdentifier, RATE_LIMITS } from "@/lib/rateLimit";
import { checkPromptGuardrail } from "@/lib/promptGuardrail";
import { getEnrichedSchema, formatSchemaForLLM } from "@/lib/schemaContext";

// Allow up to 120s for the APIFreeLLM free-tier response
export const maxDuration = 120;

const BASE_SYSTEM_PROMPT = `You are Talk2DB, an expert database assistant. You help users interact with their database using plain English.

Your capabilities:
- Translate natural language questions into accurate SQL SELECT queries
- Write multi-table JOIN queries using the foreign key relationships in the schema
- Explain query results in plain English
- Help users understand their database schema and relationships
- Suggest follow-up queries to explore data further

Rules:
1. When a user asks a data question, generate a SQL query AND explain what it does
2. Format SQL queries in a markdown code block (\`\`\`sql ... \`\`\`)
3. If a database schema is provided, use the EXACT table and column names shown
4. For queries spanning multiple tables, ALWAYS use JOINs based on the FK relationships listed in the schema
5. Only generate SELECT queries — never INSERT, UPDATE, DELETE, DROP, or any mutating SQL
6. Keep responses concise — lead with the SQL, then a brief explanation
7. If the user asks something unrelated to databases or SQL, politely redirect them`;


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

        // Guardrail — reject clearly off-topic messages before LLM call
        const guard = checkPromptGuardrail(userMessage);
        if (!guard.allowed) {
            return NextResponse.json({ error: guard.reason }, { status: 400 });
        }

        // Resolve user with DB connection
        const user = await resolveUserWithDb(session);

        // Build schema-aware system prompt using enriched FK-aware schema
        let systemPrompt = BASE_SYSTEM_PROMPT;
        if (user?.dbConnectionString) {
            const schema = await getEnrichedSchema(user.dbConnectionString);
            const schemaText = formatSchemaForLLM(schema);
            if (schemaText) {
                systemPrompt = `${BASE_SYSTEM_PROMPT}\n\nDATABASE SCHEMA (use these exact names and JOINs):\n${schemaText}`;
            }
        } else {
            systemPrompt = `${BASE_SYSTEM_PROMPT}\n\nNote: No database connected yet. You can explain SQL concepts and help craft queries, but cannot run them against a live database.`;
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
