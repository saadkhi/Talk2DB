import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { resolveUserId } from "@/lib/resolveUser";

type Ctx = { params: Promise<{ id: string }> };

export async function DELETE(_req: Request, ctx: Ctx) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const userId = await resolveUserId(session);
        if (!userId) return NextResponse.json({ error: "User not found" }, { status: 400 });

        const { id } = await ctx.params;
        if (!id) return NextResponse.json({ error: "Missing ID" }, { status: 400 });

        const query = await prisma.savedQuery.findUnique({ where: { id } });
        if (!query) return NextResponse.json({ error: "Not found" }, { status: 404 });
        if (query.userId !== userId) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

        await prisma.savedQuery.delete({ where: { id } });
        return NextResponse.json({ success: true });
    } catch (e: any) {
        return NextResponse.json({ error: e.message || "Failed to delete query" }, { status: 500 });
    }
}
