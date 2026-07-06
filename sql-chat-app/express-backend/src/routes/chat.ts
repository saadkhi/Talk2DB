import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { Client } from '@gradio/client';
import path from 'path';
import fs from 'fs/promises';
import { rateLimit, getIdentifier, RATE_LIMITS } from '../lib/rateLimit';

const prisma = new PrismaClient();
const GRADIO_SPACE = process.env.GRADIO_SPACE || "saadkhi/SQL_chatbot_API";
const HF_TOKEN = process.env.HF_TOKEN;

let systemPromptCache: string | null = null;
async function getSystemPrompt() {
    if (systemPromptCache) return systemPromptCache;
    try {
        const promptPath = path.join(process.cwd(), "../nextjs-app/src/app/api/chat/system_prompt.txt");
        systemPromptCache = await fs.readFile(promptPath, "utf-8");
        return systemPromptCache;
    } catch (error) {
        return "";
    }
}

let gradioClient: any = null;
async function getGradioClient() {
    if (gradioClient) return gradioClient;
    if (HF_TOKEN) gradioClient = await Client.connect(GRADIO_SPACE, { token: HF_TOKEN as any });
    else gradioClient = await Client.connect(GRADIO_SPACE);
    return gradioClient;
}

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
        if (!userMessage) return res.status(400).json({ error: "Message cannot be empty" });

        const systemPrompt = await getSystemPrompt();
        const fullPrompt = systemPrompt ? `${systemPrompt}\n\nUser Question: ${userMessage}` : userMessage;

        let conversation;
        if (conversation_id) {
            conversation = await prisma.conversation.findUnique({ where: { id: conversation_id, userId } });
            if (!conversation) return res.status(404).json({ error: "Conversation not found" });
        } else {
            conversation = await prisma.conversation.create({
                data: { userId, title: userMessage.slice(0, 50) },
            });
        }

        await prisma.message.create({ data: { conversationId: conversation.id, role: "user", content: userMessage } });

        let responseText: string;
        try {
            const client = await getGradioClient();
            const result = await client.predict("/generate_sql", { user_input: fullPrompt });
            responseText = String(result.data).trim();
        } catch (genErr) {
            responseText = "Gradio model call failed, falling back. Here is a structure ...";
        }

        await prisma.message.create({ data: { conversationId: conversation.id, role: "assistant", content: responseText } });
        await prisma.conversation.update({ where: { id: conversation.id }, data: { updatedAt: new Date() } });

        return res.json({ response: responseText, conversation_id: conversation.id, title: conversation.title });
    } catch (error: any) {
        return res.status(500).json({ error: "An error occurred while generating the response" });
    }
}
