/**
 * /api/team
 *
 * GET  — list all teams the authenticated user belongs to
 * POST — create a new team (caller becomes owner)
 */
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { resolveUserId } from "@/lib/resolveUser";
import { generateTeamSlug } from "@/lib/teamAuth";

export async function GET() {
    const session = await getServerSession(authOptions);
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const userId = await resolveUserId(session);
    if (!userId) return NextResponse.json({ error: "User not found" }, { status: 400 });

    const memberships = await prisma.teamMember.findMany({
        where: { userId },
        include: {
            team: {
                select: {
                    id: true,
                    name: true,
                    slug: true,
                    description: true,
                    createdAt: true,
                    _count: {
                        select: { members: true, teamDbs: true, sharedQueries: true, sharedDashboards: true },
                    },
                },
            },
        },
        orderBy: { joinedAt: "asc" },
    });

    return NextResponse.json(
        memberships.map((m) => ({
            ...m.team,
            role: m.role,
            joinedAt: m.joinedAt,
        }))
    );
}

export async function POST(req: Request) {
    const session = await getServerSession(authOptions);
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const userId = await resolveUserId(session);
    if (!userId) return NextResponse.json({ error: "User not found" }, { status: 400 });

    const body = await req.json();
    const name = (body.name ?? "").trim();
    if (!name) return NextResponse.json({ error: "Team name is required" }, { status: 400 });

    // Generate a unique slug
    let slug = generateTeamSlug(name);
    // Retry if collision (unlikely but safe)
    const exists = await prisma.team.findUnique({ where: { slug }, select: { id: true } });
    if (exists) slug = generateTeamSlug(name);

    const team = await prisma.team.create({
        data: {
            name,
            slug,
            description: (body.description ?? "").trim() || null,
            members: {
                create: { userId, role: "owner" },
            },
        },
        include: {
            _count: { select: { members: true, teamDbs: true, sharedQueries: true, sharedDashboards: true } },
        },
    });

    return NextResponse.json({ ...team, role: "owner" }, { status: 201 });
}
