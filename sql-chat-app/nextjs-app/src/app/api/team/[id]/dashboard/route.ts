/**
 * /api/team/[id]/dashboard
 *
 * GET  — list pinned dashboard items for the team (any member)
 * POST — pin a new item to the team dashboard (editor+)
 */
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { requireTeamMember, TeamAuthError } from "@/lib/teamAuth";

type Ctx = { params: Promise<{ id: string }> };

export async function GET(_req: Request, ctx: Ctx) {
    const { id } = await ctx.params;
    const session = await getServerSession(authOptions);
    try {
        await requireTeamMember(session, id, "viewer");

        const items = await prisma.teamDashboardItem.findMany({
            where: { teamId: id, pinned: true },
            include: { author: { select: { id: true, name: true, email: true } } },
            orderBy: { createdAt: "asc" },
        });

        return NextResponse.json(items);
    } catch (e) {
        if (e instanceof TeamAuthError) return NextResponse.json({ error: e.message }, { status: e.statusCode });
        throw e;
    }
}

export async function POST(req: Request, ctx: Ctx) {
    const { id } = await ctx.params;
    const session = await getServerSession(authOptions);
    try {
        const { userId } = await requireTeamMember(session, id, "editor");

        const { title, type = "table", sql, config } = await req.json();
        if (!title?.trim()) return NextResponse.json({ error: "Title is required" }, { status: 400 });
        if (!sql?.trim()) return NextResponse.json({ error: "SQL is required" }, { status: 400 });

        const validTypes = ["chart", "metric", "table"];
        if (!validTypes.includes(type)) {
            return NextResponse.json({ error: `Type must be one of: ${validTypes.join(", ")}` }, { status: 400 });
        }

        const item = await prisma.teamDashboardItem.create({
            data: {
                teamId: id,
                authorId: userId,
                title: title.trim(),
                type,
                sql: sql.trim(),
                config: config ? JSON.stringify(config) : null,
                pinned: true,
            },
            include: { author: { select: { id: true, name: true, email: true } } },
        });

        return NextResponse.json(item, { status: 201 });
    } catch (e) {
        if (e instanceof TeamAuthError) return NextResponse.json({ error: e.message }, { status: e.statusCode });
        throw e;
    }
}
