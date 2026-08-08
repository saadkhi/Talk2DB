/**
 * /api/team/[id]/db
 *
 * GET    — list team databases (any member)
 * POST   — add a new team DB (owner/editor)
 * DELETE — remove a team DB by ?dbId=... (owner only)
 */
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { requireTeamMember, TeamAuthError } from "@/lib/teamAuth";
import { encrypt } from "@/lib/encryption";
import { Pool } from "pg";
import { formatDatabaseError } from "@/lib/errorFormatter";
import { sanitizeConnectionString } from "@/lib/sanitizeConnectionString";

type Ctx = { params: Promise<{ id: string }> };

export async function GET(_req: Request, ctx: Ctx) {
    const { id } = await ctx.params;
    const session = await getServerSession(authOptions);
    try {
        await requireTeamMember(session, id, "viewer");

        const dbs = await prisma.teamDb.findMany({
            where: { teamId: id },
            select: { id: true, name: true, dbDialect: true, createdAt: true },
            orderBy: { createdAt: "asc" },
        });
        return NextResponse.json(dbs);
    } catch (e) {
        if (e instanceof TeamAuthError) return NextResponse.json({ error: e.message }, { status: e.statusCode });
        throw e;
    }
}

export async function POST(req: Request, ctx: Ctx) {
    const { id } = await ctx.params;
    const session = await getServerSession(authOptions);
    try {
        await requireTeamMember(session, id, "editor");

        const { connectionString: raw, dialect = "postgresql", name } = await req.json();
        if (!raw) return NextResponse.json({ error: "Connection string is required" }, { status: 400 });
        if (!name) return NextResponse.json({ error: "Name is required" }, { status: 400 });

        let connectionString: string;
        try {
            connectionString = sanitizeConnectionString(raw);
        } catch (e: any) {
            return NextResponse.json({ error: e.message }, { status: 400 });
        }

        // Test the connection
        try {
            const pool = new Pool({
                connectionString,
                ssl: { rejectUnauthorized: false },
                connectionTimeoutMillis: 8000,
            });
            await pool.query("SELECT 1");
            await pool.end();
        } catch (e: any) {
            const friendly = formatDatabaseError(e);
            return NextResponse.json(
                { error: friendly.friendlyMessage, suggestion: friendly.suggestion },
                { status: 400 }
            );
        }

        const encrypted = encrypt(connectionString);
        const db = await prisma.teamDb.create({
            data: { teamId: id, name: name.trim(), dbConnectionString: encrypted, dbDialect: dialect },
            select: { id: true, name: true, dbDialect: true, createdAt: true },
        });

        return NextResponse.json(db, { status: 201 });
    } catch (e) {
        if (e instanceof TeamAuthError) return NextResponse.json({ error: e.message }, { status: e.statusCode });
        throw e;
    }
}

export async function DELETE(req: Request, ctx: Ctx) {
    const { id } = await ctx.params;
    const session = await getServerSession(authOptions);
    try {
        await requireTeamMember(session, id, "owner");

        const { searchParams } = new URL(req.url);
        const dbId = searchParams.get("dbId");
        if (!dbId) return NextResponse.json({ error: "dbId query param required" }, { status: 400 });

        const db = await prisma.teamDb.findFirst({ where: { id: dbId, teamId: id } });
        if (!db) return NextResponse.json({ error: "Database not found" }, { status: 404 });

        await prisma.teamDb.delete({ where: { id: dbId } });
        return NextResponse.json({ success: true });
    } catch (e) {
        if (e instanceof TeamAuthError) return NextResponse.json({ error: e.message }, { status: e.statusCode });
        throw e;
    }
}
