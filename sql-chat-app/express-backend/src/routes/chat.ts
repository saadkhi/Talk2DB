import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { Client } from '@gradio/client';
import path from 'path';
import fs from 'fs/promises';
import { rateLimit, getIdentifier, RATE_LIMITS } from '../lib/rateLimit';
import { callOpenRouter } from '../lib/openrouter';
import { getUserDbPool } from '../lib/dbConnection';

const prisma = new PrismaClient();
const GRADIO_SPACE = process.env.GRADIO_SPACE || "saadkhi/SQL_chatbot_API";
const HF_TOKEN = process.env.HF_TOKEN;

// ── System prompt ────────────────────────────────────────────────────────────
// Try the file next to the Next.js app first; fall back to a built-in string so
// the chat endpoint always has a meaningful persona even in CI / Docker.
let systemPromptCache: string | null = null;

async function getSystemPrompt(): Promise<string> {
    if (systemPromptCache !== null) return systemPromptCache;
    try {
        // Resolve relative to this file's location so it works regardless of cwd
        const filePath = path.resolve(
            __dirname,
            "../../../../nextjs-app/src/app/api/chat/system_prompt.txt"
        );
        systemPromptCache = await fs.readFile(filePath, "utf-8");
        return systemPromptCache;
    } catch {
        // Fallback built-in prompt — keeps chat functional without the file
        systemPromptCache = [
            "You are Talk2DB, an expert PostgreSQL database assistant.",
            "Translate natural language questions into accurate PostgreSQL SELECT queries.",
            "Format SQL in markdown code blocks. Only produce SELECT queries.",
            "Use exact table/column names from the schema provided.",
            "After generating SQL, briefly explain what it does and what the results mean.",
        ].join(" ");
        return systemPromptCache;
    }
}

// ── Schema context ────────────────────────────────────────────────────────────
// Fetch the user's connected database schema and format it as a compact text
// block that the LLM can use to write accurate, schema-aware SQL.
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

// ── Gradio client singleton ───────────────────────────────────────────────────
let gradioClient: any = null;

async function getGradioClient() {
    if (gradioClient) return gradioClient;
    try {
        gradioClient = HF_TOKEN
            ? await Client.connect(GRADIO_SPACE, { token: HF_TOKEN as any })
            : await Client.connect(GRADIO_SPACE);
        return gradioClient;
    } catch (err) {
        gradioClient = null; // don't cache a broken connection
        throw err;
    }
}

// ── Chat handler ─────────────────────────────────────────────────────────────
export async function chatHandler(req: Request, res: Response) {
    const identifier = getIdentifier(req as unknown as Request);
    const rateLimitResult = rateLimit(identifier, RATE_LIMITS.chat.limit, RATE_LIMITS.chat.windowMs);

    if (!rateLimitResult.success) {
        return res.status(429).json({ error: "Rate limit exceeded" });
    }

    try {
        const userId = (req as any).userId;
        if (!userId) return res.status(401).json({ error: "Authentication required" });

        const { message: userMessage, conversation_id } = req.body;
        if (!userMessage?.trim()) return res.status(400).json({ error: "Message cannot be empty" });

        // ── Fetch user's DB connection string ─────────────────────────────
        const user = await prisma.user.findUnique({
            where: { id: userId },
            select: { dbConnectionString: true },
        });

        // ── Build schema-aware system prompt ─────────────────────────────
        const baseSystemPrompt = await getSystemPrompt();
        let systemPrompt = baseSystemPrompt;

        if (user?.dbConnectionString) {
            const schemaContext = await getSchemaContext(user.dbConnectionString);
            if (schemaContext) {
                systemPrompt = `${baseSystemPrompt}\n\nDATABASE SCHEMA (use these exact names):\n${schemaContext}`;
            }
        } else {
            systemPrompt = `${baseSystemPrompt}\n\nNote: This user has not connected a database yet. You can still explain SQL concepts and help them craft queries, but you cannot run them.`;
        }

        // ── Conversation persistence ──────────────────────────────────────
        let conversation;
        if (conversation_id) {
            conversation = await prisma.conversation.findUnique({
                where: { id: conversation_id, userId },
            });
            if (!conversation) return res.status(404).json({ error: "Conversation not found" });
        } else {
            conversation = await prisma.conversation.create({
                data: { userId, title: userMessage.slice(0, 50) },
            });
        }

        await prisma.message.create({
            data: { conversationId: conversation.id, role: "user", content: userMessage },
        });

        // ── Generate response: Gradio → OpenRouter fallback ───────────────
        let responseText: string;

        try {
            const client = await getGradioClient();
            // Pass the full schema-aware system prompt prepended to the user message
            const fullPrompt = `${systemPrompt}\n\nUser Question: ${userMessage}`;
            const result = await client.predict("/generate_sql", { user_input: fullPrompt });

            if (result && Array.isArray(result.data)) {
                responseText = String(result.data[0]).trim();
            } else if (result?.data) {
                responseText = String(result.data).trim();
            } else {
                responseText = String(result).trim();
            }

            if (!responseText) throw new Error("Empty response from Gradio");
        } catch (gradioErr) {
            // ── OpenRouter fallback ──────────────────────────────────────
            if (process.env.NODE_ENV !== "production") {
                console.warn("Gradio failed, falling back to OpenRouter:", (gradioErr as Error).message);
            }
            try {
                responseText = await callOpenRouter(systemPrompt, userMessage);
            } catch (openRouterErr) {
                if (process.env.NODE_ENV !== "production") {
                    console.error("OpenRouter fallback also failed:", openRouterErr);
                }
                return res.status(503).json({
                    error: "AI service temporarily unavailable. Please try again in a moment.",
                });
            }
        }

        // ── Persist assistant reply ───────────────────────────────────────
        await prisma.message.create({
            data: { conversationId: conversation.id, role: "assistant", content: responseText },
        });
        await prisma.conversation.update({
            where: { id: conversation.id },
            data: { updatedAt: new Date() },
        });

        return res.json({
            response: responseText,
            conversation_id: conversation.id,
            title: conversation.title,
        });
    } catch (error: any) {
        if (process.env.NODE_ENV !== "production") {
            console.error("Chat handler error:", error);
        }
        return res.status(500).json({ error: "An error occurred while generating the response" });
    }
}
