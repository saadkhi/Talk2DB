/**
 * /api/team/[id]/members/[memberId]
 *
 * PATCH  — update member role (owner only; cannot demote yourself if last owner)
 * DELETE — remove member (owner only; cannot remove yourself if last owner)
 */
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { requireTeamMember, TeamAuthError } from "@/lib/teamAuth";

type Ctx = { params: Promise<{ id: string; memberId: string }> };

async function guardLastOwner(teamId: string, targetMemberId: string, newRole?: string) {
    const target = await prisma.teamMember.findUnique({ where: { id: targetMemberId } });
    if (!target || target.role !== "owner") return; // not an owner, no risk
    if (newRole === "owner") return; // staying owner

    // Count remaining owners
    const ownerCount = await prisma.teamMember.count({
        where: { teamId, role: "owner" },
    });
    if (ownerCount <= 1) {
        throw new TeamAuthError("Cannot remove or demote the last owner of a team", 400);
    }
}

export async function PATCH(req: Request, ctx: Ctx) {
    const { id, memberId } = await ctx.params;
    const session = await getServerSession(authOptions);
    try {
        await requireTeamMember(session, id, "owner");

        const { role } = await req.json();
        const validRoles = ["owner", "editor", "viewer"];
        if (!validRoles.includes(role)) {
            return NextResponse.json({ error: `Role must be one of: ${validRoles.join(", ")}` }, { status: 400 });
        }

        await guardLastOwner(id, memberId, role);

        const updated = await prisma.teamMember.update({
            where: { id: memberId },
            data: { role },
            include: { user: { select: { id: true, name: true, email: true } } },
        });
        return NextResponse.json(updated);
    } catch (e) {
        if (e instanceof TeamAuthError) return NextResponse.json({ error: e.message }, { status: e.statusCode });
        throw e;
    }
}

export async function DELETE(_req: Request, ctx: Ctx) {
    const { id, memberId } = await ctx.params;
    const session = await getServerSession(authOptions);
    try {
        await requireTeamMember(session, id, "owner");
        await guardLastOwner(id, memberId);
        await prisma.teamMember.delete({ where: { id: memberId } });
        return NextResponse.json({ success: true });
    } catch (e) {
        if (e instanceof TeamAuthError) return NextResponse.json({ error: e.message }, { status: e.statusCode });
        throw e;
    }
}
