import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { resolveUserId } from "@/lib/resolveUser";

export async function POST(req: Request) {
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

        const { title, prompt, sql, chartType, summary, insights } = await req.json();

        if (!prompt || !sql) {
            return NextResponse.json({ error: "prompt and sql are required" }, { status: 400 });
        }

        const saved = await prisma.savedReport.create({
            data: {
                userId,
                title: title || prompt.slice(0, 80),
                prompt,
                sql,
                chartType: chartType || null,
                summary: summary || null,
                insights: Array.isArray(insights) ? insights : [],
            },
        });

        return NextResponse.json({ id: saved.id, message: "Report saved" });
    } catch (error: any) {
        if (process.env.NODE_ENV !== "production") {
            console.error("Save report error:", error);
        }
        return NextResponse.json(
            { error: error.message || "Failed to save report" },
            { status: 500 }
        );
    }
}

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

        const reports = await prisma.savedReport.findMany({
            where: { userId },
            orderBy: { createdAt: "desc" },
            select: {
                id: true,
                title: true,
                prompt: true,
                sql: true,
                chartType: true,
                summary: true,
                insights: true,
                createdAt: true,
            },
        });

        return NextResponse.json(reports);
    } catch (error: any) {
        if (process.env.NODE_ENV !== "production") {
            console.error("Fetch saved reports error:", error);
        }
        return NextResponse.json(
            { error: error.message || "Failed to fetch saved reports" },
            { status: 500 }
        );
    }
}
