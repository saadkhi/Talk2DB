import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export async function DELETE(req: Request, { params }: { params: { id: string } }) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user?.id) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const id = params.id;
        if (!id) return NextResponse.json({ error: "Missing ID" }, { status: 400 });

        // Ensure the query belongs to the user
        const query = await prisma.savedQuery.findUnique({ where: { id } });
        if (!query) return NextResponse.json({ error: "Not found" }, { status: 404 });
        if (query.userId !== session.user.id) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

        await prisma.savedQuery.delete({ where: { id } });

        return NextResponse.json({ success: true });
    } catch (e: any) {
        return NextResponse.json({ error: e.message || "Failed to delete query" }, { status: 500 });
    }
}
