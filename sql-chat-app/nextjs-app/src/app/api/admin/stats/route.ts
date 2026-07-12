import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";

function isAdmin(email: string | null | undefined) {
    return email === process.env.ADMIN_EMAIL;
}

export async function GET() {
    const session = await getServerSession(authOptions);
    if (!session?.user || !isAdmin((session.user as any).email)) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // ── Aggregate stats ──────────────────────────────────────────
    const [
        totalUsers,
        totalConversations,
        totalMessages,
        totalReports,
        usersWithDb,
        recentMessages,
    ] = await Promise.all([
        prisma.user.count(),
        prisma.conversation.count(),
        prisma.message.count(),
        prisma.savedReport.count(),
        prisma.user.count({ where: { dbConnectionString: { not: null } } }),
        // Last 7 days of message activity bucketed by day
        prisma.$queryRaw<{ day: Date; count: bigint }[]>`
            SELECT DATE_TRUNC('day', "createdAt") AS day, COUNT(*) AS count
            FROM "Message"
            WHERE "createdAt" >= NOW() - INTERVAL '7 days'
            GROUP BY day
            ORDER BY day ASC
        `,
    ]);

    // ── Per-user details ─────────────────────────────────────────
    const users = await prisma.user.findMany({
        orderBy: { createdAt: "desc" },
        select: {
            id: true,
            name: true,
            email: true,
            dbDialect: true,
            dbConnectionString: true,
            createdAt: true,
            updatedAt: true,
            _count: {
                select: {
                    conversations: true,
                    savedReports: true,
                },
            },
            conversations: {
                orderBy: { updatedAt: "desc" },
                take: 1,
                select: { updatedAt: true, title: true },
            },
        },
    });

    // Count total messages per user via conversations
    const messageCounts = await prisma.message.groupBy({
        by: ["conversationId"],
        _count: { id: true },
    });

    // Map conversationId → message count
    const convMsgMap = new Map<string, number>();
    for (const m of messageCounts) convMsgMap.set(m.conversationId, m._count.id);

    // Get all conversations to map userId → message count
    const allConversations = await prisma.conversation.findMany({
        select: { id: true, userId: true },
    });
    const userMsgCount = new Map<string, number>();
    for (const c of allConversations) {
        const prev = userMsgCount.get(c.userId) ?? 0;
        userMsgCount.set(c.userId, prev + (convMsgMap.get(c.id) ?? 0));
    }

    const enrichedUsers = users.map((u) => ({
        id: u.id,
        name: u.name,
        email: u.email,
        dbConnected: !!u.dbConnectionString,
        dbDialect: u.dbDialect,
        conversationCount: u._count.conversations,
        messageCount: userMsgCount.get(u.id) ?? 0,
        savedReportCount: u._count.savedReports,
        lastActive: u.conversations[0]?.updatedAt ?? u.updatedAt,
        lastConversationTitle: u.conversations[0]?.title ?? null,
        joinedAt: u.createdAt,
    }));

    // ── Activity chart data ───────────────────────────────────────
    const activityChart = recentMessages.map((r) => ({
        day: r.day.toISOString().slice(0, 10),
        count: Number(r.count),
    }));

    return NextResponse.json({
        stats: {
            totalUsers,
            totalConversations,
            totalMessages,
            totalReports,
            usersWithDb,
            dbConnectionRate: totalUsers > 0 ? Math.round((usersWithDb / totalUsers) * 100) : 0,
        },
        users: enrichedUsers,
        activityChart,
    });
}
