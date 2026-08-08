import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { resolveUserId } from "@/lib/resolveUser";

/**
 * GET /api/usage
 *
 * Returns per-user LLM usage stats for the current billing window.
 * Query params:
 *   ?days=30          — window in days (default 30, max 90)
 *   ?breakdown=true   — include per-provider and per-source breakdown
 */
export async function GET(req: Request) {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = await resolveUserId(session);
    if (!userId) {
        return NextResponse.json({ error: "User not found" }, { status: 400 });
    }

    const { searchParams } = new URL(req.url);
    const days = Math.min(Number(searchParams.get("days") ?? "30"), 90);
    const breakdown = searchParams.get("breakdown") === "true";

    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

    // Aggregate totals
    const [totalRows, successRows] = await Promise.all([
        prisma.llmUsage.count({ where: { userId, createdAt: { gte: since } } }),
        prisma.llmUsage.count({ where: { userId, success: true, createdAt: { gte: since } } }),
    ]);

    const tokenAgg = await (prisma.llmUsage as any).aggregate({
        where: { userId, createdAt: { gte: since } },
        _sum: { promptTokens: true, durationMs: true },
    });

    const result: Record<string, any> = {
        windowDays: days,
        since: since.toISOString(),
        totalCalls: totalRows,
        successfulCalls: successRows,
        failedCalls: totalRows - successRows,
        estimatedTokens: tokenAgg._sum?.promptTokens ?? 0,
        totalDurationMs: tokenAgg._sum?.durationMs ?? 0,
    };

    if (breakdown) {
        // Group by provider
        const byProvider = await prisma.llmUsage.groupBy({
            by: ["provider"],
            where: { userId, createdAt: { gte: since } },
            _count: { id: true },
            _sum: { promptTokens: true },
        });

        // Group by source feature
        const bySource = await prisma.llmUsage.groupBy({
            by: ["source"],
            where: { userId, createdAt: { gte: since } },
            _count: { id: true },
        });

        result.breakdown = {
            byProvider: byProvider.map((r) => ({
                provider: r.provider,
                calls: r._count.id,
                estimatedTokens: r._sum.promptTokens ?? 0,
            })),
            bySource: bySource.map((r) => ({
                source: r.source,
                calls: r._count.id,
            })),
        };
    }

    return NextResponse.json(result);
}
