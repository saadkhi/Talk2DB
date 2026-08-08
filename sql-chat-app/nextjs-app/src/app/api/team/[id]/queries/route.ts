/**
 * /api/team/[id]/queries
 *
 * GET  — list all shared queries for the team (any member)
 * POST — publish a query to the team library (editor+)
 */
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { requireTeamMember, TeamAuthError } from "@/lib/teamAuth";

type Ctx = { params: Promise<{ id: string }> };

export async function GET(req: Request, ctx: Ctx) {
    const { id } = await ctx.params;
    const session = await getServerSession(authOptions);
    try {
        await requireTeamMember(session, id, "viewer");

        const { searchParams } = new URL(req.url);
        const tag = searchParams.get("tag");
        const search = searchParams.get("q");

        const queries = await prisma.teamQuery.findMany({
            where: {
                teamId: id,
                ...(tag ? { tags: { has: tag } } : {}),
                ...(search
                    ? {
                          OR: [
                              { title: { contains: search, mode: "insensitive" } },
                              { description: { contains: search, mode: "insensitive" } },
                              { sql: { contains: search, mode: "insensitive" } },
                          ],
                      }
                    : {}),
            },
            include: {
                author: { select: { id: true, name: true, email: true } },
            },
            orderBy: { createdAt: "desc" },
        });

        return NextResponse.json(queries);
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

        const { title, sql, tags = [], description } = await req.json();
        if (!title?.trim()) return NextResponse.json({ error: "Title is required" }, { status: 400 });
        if (!sql?.trim()) return NextResponse.json({ error: "SQL is required" }, { status: 400 });

        const query = await prisma.teamQuery.create({
            data: {
                teamId: id,
                authorId: userId,
                title: title.trim(),
                sql: sql.trim(),
                tags: Array.isArray(tags) ? tags : [],
                description: description?.trim() || null,
            },
            include: { author: { select: { id: true, name: true, email: true } } },
        });

        return NextResponse.json(query, { status: 201 });
    } catch (e) {
        if (e instanceof TeamAuthError) return NextResponse.json({ error: e.message }, { status: e.statusCode });
        throw e;
    }
}
