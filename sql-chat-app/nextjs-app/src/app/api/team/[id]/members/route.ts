/**
 * /api/team/[id]/members
 *
 * GET  — list members (any member)
 * POST — invite a user by email (owner only); creates member with given role
 */
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { requireTeamMember, TeamAuthError, hasRole } from "@/lib/teamAuth";

type Ctx = { params: Promise<{ id: string }> };

export async function GET(_req: Request, ctx: Ctx) {
    const { id } = await ctx.params;
    const session = await getServerSession(authOptions);
    try {
        await requireTeamMember(session, id, "viewer");

        const members = await prisma.teamMember.findMany({
            where: { teamId: id },
            include: { user: { select: { id: true, name: true, email: true } } },
            orderBy: { joinedAt: "asc" },
        });

        return NextResponse.json(members);
    } catch (e) {
        if (e instanceof TeamAuthError) return NextResponse.json({ error: e.message }, { status: e.statusCode });
        throw e;
    }
}

export async function POST(req: Request, ctx: Ctx) {
    const { id } = await ctx.params;
    const session = await getServerSession(authOptions);
    try {
        const { member: callerMember } = await requireTeamMember(session, id, "owner");

        const { email, role = "viewer" } = await req.json();
        if (!email) return NextResponse.json({ error: "Email is required" }, { status: 400 });

        const validRoles = ["owner", "editor", "viewer"];
        if (!validRoles.includes(role)) {
            return NextResponse.json({ error: `Role must be one of: ${validRoles.join(", ")}` }, { status: 400 });
        }

        // Only owners can assign the owner role
        if (role === "owner" && callerMember.role !== "owner") {
            return NextResponse.json({ error: "Only owners can assign the owner role" }, { status: 403 });
        }

        // Look up the user being invited
        const invitee = await prisma.user.findUnique({
            where: { email },
            select: { id: true, name: true, email: true },
        });
        if (!invitee) {
            return NextResponse.json(
                { error: `No account found for ${email}. They must sign up first.` },
                { status: 404 }
            );
        }

        // Upsert: if already a member, update their role
        const newMember = await prisma.teamMember.upsert({
            where: { teamId_userId: { teamId: id, userId: invitee.id } },
            update: { role },
            create: { teamId: id, userId: invitee.id, role },
            include: { user: { select: { id: true, name: true, email: true } } },
        });

        return NextResponse.json(newMember, { status: 201 });
    } catch (e) {
        if (e instanceof TeamAuthError) return NextResponse.json({ error: e.message }, { status: e.statusCode });
        throw e;
    }
}
