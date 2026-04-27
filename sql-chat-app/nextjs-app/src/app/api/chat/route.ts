import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import prisma from "@/lib/prisma";
import { Client } from "@gradio/client";

const GRADIO_SPACE = process.env.GRADIO_SPACE || "saadkhi/SQL_chatbot_API";
const HF_TOKEN = process.env.HF_TOKEN;

// Cache Gradio client
let gradioClient: any = null;

async function getGradioClient() {
    if (gradioClient) return gradioClient;

    try {
        if (HF_TOKEN) {
            gradioClient = await Client.connect(GRADIO_SPACE, { token: HF_TOKEN as `hf_${string}` });
        } else {
            gradioClient = await Client.connect(GRADIO_SPACE);
        }
        return gradioClient;
    } catch (error) {
        console.error("Failed to connect to Gradio:", error);
        throw error;
    }
}

function generateFallbackResponse(userMessage: string) {
    const intro =
        "The conversational model is not loaded right now, but I'm still here to help. " +
        "Here's a structured reply you can use:";
    const template = `
${intro}

1) I received your request:
   "${userMessage}"

2) Suggested next steps:
- Confirm the database tables and columns involved.
- Identify any filters, ordering, or aggregations needed.
- Translate the above into SQL using the database's dialect.

3) Example prompt you can try once the model is ready:
   "Write a SQL query to address: ${userMessage}"
  `.trim();
    return template;
}

export async function POST(req: Request) {
    try {
        const { message: userMessage, conversation_id } = await req.json();

        if (!userMessage) {
            return NextResponse.json(
                { error: "Message cannot be empty" },
                { status: 400 }
            );
        }

        const session = await getServerSession(authOptions);

        // Handle guest user
        if (!session?.user) {
            try {
                const client = await getGradioClient();
                const result = await client.predict("/generate_sql", {
                    user_input: userMessage,
                });
                const responseText = String(result.data).trim();
                return NextResponse.json({
                    response: responseText,
                    guest: true,
                });
            } catch (genErr) {
                console.error("Gradio model call failed, falling back:", genErr);
                const responseText = generateFallbackResponse(userMessage);
                return NextResponse.json({
                    response: responseText,
                    guest: true,
                });
            }
        }

        // Authenticated user
        const userId = (session.user as any).id;
        let conversation;

        if (conversation_id) {
            conversation = await prisma.conversation.findUnique({
                where: { id: conversation_id, userId },
            });
            if (!conversation) {
                return NextResponse.json(
                    { error: "Conversation not found" },
                    { status: 404 }
                );
            }
        } else {
            conversation = await prisma.conversation.create({
                data: {
                    userId,
                    title: userMessage.slice(0, 50),
                },
            });
        }

        // Save user message
        await prisma.message.create({
            data: {
                conversationId: conversation.id,
                role: "user",
                content: userMessage,
            },
        });

        let responseText: string;
        try {
            const client = await getGradioClient();
            const result = await client.predict("/generate_sql", {
                user_input: userMessage,
            });
            responseText = String(result.data).trim();
        } catch (genErr) {
            console.error("Gradio model call failed, falling back:", genErr);
            responseText = generateFallbackResponse(userMessage);
        }

        // Save assistant message
        await prisma.message.create({
            data: {
                conversationId: conversation.id,
                role: "assistant",
                content: responseText,
            },
        });

        // Update conversation updated_at automatically by updatedAt field
        await prisma.conversation.update({
            where: { id: conversation.id },
            data: { updatedAt: new Date() },
        });

        return NextResponse.json({
            response: responseText,
            conversation_id: conversation.id,
            title: conversation.title,
        });
    } catch (error: any) {
        console.error("Chat error:", error);
        return NextResponse.json(
            { error: "An error occurred while generating the response" },
            { status: 500 }
        );
    }
}
