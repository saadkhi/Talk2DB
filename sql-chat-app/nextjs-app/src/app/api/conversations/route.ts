import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { resolveUserId } from "@/lib/resolveUser";

export async function GET() {
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

        const conversations = await prisma.conversation.findMany({
            where: { userId },
            orderBy: { updatedAt: "desc" },
        });

        return NextResponse.json(conversations);
    } catch (error) {
        if (process.env.NODE_ENV !== "production") {
            console.error("Fetch conversations error:", error);
        }
        return NextResponse.json(
            { error: "Internal server error" },
            { status: 500 }
        );
    }
}
