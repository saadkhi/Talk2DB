import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export async function GET() {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user?.id) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const queries = await prisma.savedQuery.findMany({
            where: { userId: session.user.id },
            orderBy: { createdAt: 'desc' }
        });

        return NextResponse.json(queries);
    } catch (e: any) {
        return NextResponse.json({ error: e.message || "Failed to load saved queries" }, { status: 500 });
    }
}

export async function POST(req: Request) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user?.id) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { title, sql, tags } = await req.json();
        if (!title || !sql) {
            return NextResponse.json({ error: "Title and SQL are required" }, { status: 400 });
        }

        const savedQuery = await prisma.savedQuery.create({
            data: {
                userId: session.user.id,
                title,
                sql,
                tags: tags || []
            }
        });

        return NextResponse.json(savedQuery);
    } catch (e: any) {
        return NextResponse.json({ error: e.message || "Failed to save query" }, { status: 500 });
    }
}
