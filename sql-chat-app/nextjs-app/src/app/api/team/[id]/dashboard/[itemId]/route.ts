/**
 * /api/team/[id]/dashboard/[itemId]
 *
 * PATCH  — update title / config (author or owner)
 * DELETE — unpin / remove a dashboard item (author or owner)
 */
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { requireTeamMember, TeamAuthError } from "@/lib/teamAuth";

type Ctx = { params: Promise<{ id: string; itemId: string }> };

export async function PATCH(req: Request, ctx: Ctx) {
    const { id, itemId } = await ctx.params;
    const session = await getServerSession(authOptions);
    try {
        const { member, userId } = await requireTeamMember(session, id, "editor");

        const item = await prisma.teamDashboardItem.findFirst({ where: { id: itemId, teamId: id } });
        if (!item) return NextResponse.json({ error: "Dashboard item not found" }, { status: 404 });

        if (item.authorId !== userId && member.role !== "owner") {
            return NextResponse.json({ error: "Only the author or an owner can edit this item" }, { status: 403 });
        }

        const { title, config, pinned } = await req.json();
        const updated = await prisma.teamDashboardItem.update({
            where: { id: itemId },
            data: {
                ...(title ? { title: title.trim() } : {}),
                ...(config !== undefined ? { config: config ? JSON.stringify(config) : null } : {}),
                ...(pinned !== undefined ? { pinned } : {}),
            },
            include: { author: { select: { id: true, name: true, email: true } } },
        });

        return NextResponse.json(updated);
    } catch (e) {
        if (e instanceof TeamAuthError) return NextResponse.json({ error: e.message }, { status: e.statusCode });
        throw e;
    }
}

export async function DELETE(_req: Request, ctx: Ctx) {
    const { id, itemId } = await ctx.params;
    const session = await getServerSession(authOptions);
    try {
        const { member, userId } = await requireTeamMember(session, id, "editor");

        const item = await prisma.teamDashboardItem.findFirst({ where: { id: itemId, teamId: id } });
        if (!item) return NextResponse.json({ error: "Dashboard item not found" }, { status: 404 });

        if (item.authorId !== userId && member.role !== "owner") {
            return NextResponse.json({ error: "Only the author or an owner can remove this item" }, { status: 403 });
        }

        await prisma.teamDashboardItem.delete({ where: { id: itemId } });
        return NextResponse.json({ success: true });
    } catch (e) {
        if (e instanceof TeamAuthError) return NextResponse.json({ error: e.message }, { status: e.statusCode });
        throw e;
    }
}
