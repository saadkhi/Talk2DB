/**
 * /api/team/[id]/queries/[queryId]
 *
 * GET    — get a single team query (any member)
 * PATCH  — update a team query (author or owner)
 * DELETE — delete a team query (author or owner)
 *
 * POST /fork — fork a team query into the caller's personal saved queries
 */
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { requireTeamMember, TeamAuthError } from "@/lib/teamAuth";

type Ctx = { params: Promise<{ id: string; queryId: string }> };

export async function GET(_req: Request, ctx: Ctx) {
    const { id, queryId } = await ctx.params;
    const session = await getServerSession(authOptions);
    try {
        await requireTeamMember(session, id, "viewer");

        const query = await prisma.teamQuery.findFirst({
            where: { id: queryId, teamId: id },
            include: { author: { select: { id: true, name: true, email: true } } },
        });
        if (!query) return NextResponse.json({ error: "Query not found" }, { status: 404 });

        return NextResponse.json(query);
    } catch (e) {
        if (e instanceof TeamAuthError) return NextResponse.json({ error: e.message }, { status: e.statusCode });
        throw e;
    }
}

export async function PATCH(req: Request, ctx: Ctx) {
    const { id, queryId } = await ctx.params;
    const session = await getServerSession(authOptions);
    try {
        const { member, userId } = await requireTeamMember(session, id, "editor");

        const query = await prisma.teamQuery.findFirst({ where: { id: queryId, teamId: id } });
        if (!query) return NextResponse.json({ error: "Query not found" }, { status: 404 });

        // Only the author or an owner can edit
        if (query.authorId !== userId && member.role !== "owner") {
            return NextResponse.json({ error: "Only the author or an owner can edit this query" }, { status: 403 });
        }

        const { title, sql, tags, description } = await req.json();
        const updated = await prisma.teamQuery.update({
            where: { id: queryId },
            data: {
                ...(title ? { title: title.trim() } : {}),
                ...(sql ? { sql: sql.trim() } : {}),
                ...(tags !== undefined ? { tags } : {}),
                ...(description !== undefined ? { description: description?.trim() || null } : {}),
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
    const { id, queryId } = await ctx.params;
    const session = await getServerSession(authOptions);
    try {
        const { member, userId } = await requireTeamMember(session, id, "editor");

        const query = await prisma.teamQuery.findFirst({ where: { id: queryId, teamId: id } });
        if (!query) return NextResponse.json({ error: "Query not found" }, { status: 404 });

        if (query.authorId !== userId && member.role !== "owner") {
            return NextResponse.json({ error: "Only the author or an owner can delete this query" }, { status: 403 });
        }

        await prisma.teamQuery.delete({ where: { id: queryId } });
        return NextResponse.json({ success: true });
    } catch (e) {
        if (e instanceof TeamAuthError) return NextResponse.json({ error: e.message }, { status: e.statusCode });
        throw e;
    }
}

/** POST /api/team/[id]/queries/[queryId]/fork — copy into personal saved queries */
export async function POST(req: Request, ctx: Ctx) {
    const { id, queryId } = await ctx.params;
    const session = await getServerSession(authOptions);
    try {
        const { userId } = await requireTeamMember(session, id, "viewer");

        const source = await prisma.teamQuery.findFirst({ where: { id: queryId, teamId: id } });
        if (!source) return NextResponse.json({ error: "Query not found" }, { status: 404 });

        const forked = await prisma.savedQuery.create({
            data: {
                userId,
                title: `[Fork] ${source.title}`,
                sql: source.sql,
                tags: [...source.tags, "forked"],
            },
        });

        return NextResponse.json(forked, { status: 201 });
    } catch (e) {
        if (e instanceof TeamAuthError) return NextResponse.json({ error: e.message }, { status: e.statusCode });
        throw e;
    }
}
