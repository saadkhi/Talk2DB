/**
 * /api/team/[id]
 *
 * GET    — get team details (any member)
 * PATCH  — update name / description (owner only)
 * DELETE — delete the team (owner only)
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
        const { member, team } = await requireTeamMember(session, id, "viewer");

        const full = await prisma.team.findUnique({
            where: { id },
            include: {
                members: {
                    include: { user: { select: { id: true, name: true, email: true } } },
                    orderBy: { joinedAt: "asc" },
                },
                teamDbs: { select: { id: true, name: true, dbDialect: true, createdAt: true } },
                _count: { select: { sharedQueries: true, sharedDashboards: true } },
            },
        });

        return NextResponse.json({ ...full, currentUserRole: member.role });
    } catch (e) {
        if (e instanceof TeamAuthError) return NextResponse.json({ error: e.message }, { status: e.statusCode });
        throw e;
    }
}

export async function PATCH(req: Request, ctx: Ctx) {
    const { id } = await ctx.params;
    const session = await getServerSession(authOptions);
    try {
        await requireTeamMember(session, id, "owner");

        const { name, description } = await req.json();
        const updated = await prisma.team.update({
            where: { id },
            data: {
                ...(name ? { name: name.trim() } : {}),
                ...(description !== undefined ? { description: description?.trim() || null } : {}),
            },
        });
        return NextResponse.json(updated);
    } catch (e) {
        if (e instanceof TeamAuthError) return NextResponse.json({ error: e.message }, { status: e.statusCode });
        throw e;
    }
}

export async function DELETE(_req: Request, ctx: Ctx) {
    const { id } = await ctx.params;
    const session = await getServerSession(authOptions);
    try {
        await requireTeamMember(session, id, "owner");
        await prisma.team.delete({ where: { id } });
        return NextResponse.json({ success: true });
    } catch (e) {
        if (e instanceof TeamAuthError) return NextResponse.json({ error: e.message }, { status: e.statusCode });
        throw e;
    }
}
