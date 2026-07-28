import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { resolveUserId } from "@/lib/resolveUser";

export async function GET(
    _req: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const session = await getServerSession(authOptions);

        if (!session?.user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        // FIX: use resolveUserId so stale OAuth sessions (token.id missing) still work
        const userId = await resolveUserId(session);
        if (!userId) {
            return NextResponse.json({ error: "Account not found. Please sign out and sign back in." }, { status: 401 });
        }

        const { id } = await params;

        const conversation = await prisma.conversation.findUnique({
            where: { id, userId },
            include: {
                messages: {
                    orderBy: { createdAt: "asc" },
                },
            },
        });

        if (!conversation) {
            return NextResponse.json(
                { error: "Conversation not found" },
                { status: 404 }
            );
        }

        return NextResponse.json(conversation);
    } catch (error) {
        if (process.env.NODE_ENV !== "production") {
            console.error("Fetch conversation detail error:", error);
        }
        return NextResponse.json(
            { error: "Internal server error" },
            { status: 500 }
        );
    }
}

export async function DELETE(
    _req: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const session = await getServerSession(authOptions);

        if (!session?.user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        // FIX: use resolveUserId so stale OAuth sessions (token.id missing) still work
        const userId = await resolveUserId(session);
        if (!userId) {
            return NextResponse.json({ error: "Account not found. Please sign out and sign back in." }, { status: 401 });
        }

        const { id } = await params;

        // Verify the conversation belongs to this user before deleting
        const conversation = await prisma.conversation.findUnique({
            where: { id, userId },
        });

        if (!conversation) {
            return NextResponse.json(
                { error: "Conversation not found" },
                { status: 404 }
            );
        }

        await prisma.conversation.delete({
            where: { id },
        });

        return NextResponse.json({ message: "Conversation deleted" });
    } catch (error) {
        if (process.env.NODE_ENV !== "production") {
            console.error("Delete conversation error:", error);
        }
        return NextResponse.json(
            { error: "Internal server error" },
            { status: 500 }
        );
    }
}
