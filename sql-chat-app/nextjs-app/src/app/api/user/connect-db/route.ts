import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { encrypt } from "@/lib/encryption";
import { Pool } from "pg";
import { formatDatabaseError } from "@/lib/errorFormatter";
import { rateLimit, getIdentifier, RATE_LIMITS } from "@/lib/rateLimit";
import { sanitizeConnectionString } from "@/lib/sanitizeConnectionString";

import type { Session } from "next-auth";

/**
 * Reliably get the user's DB record id from a session.
 *
 * Priority order:
 *  1. session.user.id  (set by JWT callback on first sign-in)
 *  2. Look up by session.user.email  (fallback for stale tokens / OAuth)
 *
 * Returns null if neither resolves to a DB row.
 */
async function getDbUserId(session: Session | null): Promise<string | null> {
    if (!session?.user) return null;

    // Try the id from the JWT first
    const tokenId = (session.user as any).id as string | undefined;
    if (tokenId) {
        // Confirm the row actually exists (guards against stale tokens)
        const exists = await prisma.user.findUnique({
            where: { id: tokenId },
            select: { id: true },
        });
        if (exists) return exists.id;
    }

    // Fall back to email lookup — email is always present and unique
    const email = session.user.email;
    if (email) {
        const byEmail = await prisma.user.findUnique({
            where: { email },
            select: { id: true },
        });
        if (byEmail) return byEmail.id;
    }

    return null;
}

export async function POST(req: Request) {
    // ── Rate limiting ──────────────────────────────────────────────────────
    const identifier = getIdentifier(req);
    const rateLimitResult = rateLimit(identifier, RATE_LIMITS.connectDb.limit, RATE_LIMITS.connectDb.windowMs);

    if (!rateLimitResult.success) {
        return NextResponse.json(
            { error: "Rate limit exceeded", limit: rateLimitResult.limit, resetTime: rateLimitResult.resetTime },
            {
                status: 429,
                headers: {
                    "X-RateLimit-Limit": rateLimitResult.limit.toString(),
                    "X-RateLimit-Remaining": rateLimitResult.remaining.toString(),
                    "X-RateLimit-Reset": rateLimitResult.resetTime.toString(),
                },
            }
        );
    }

    try {
        const session = await getServerSession(authOptions);
        if (!session?.user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        // ── Parse & sanitize connection string ─────────────────────────────
        const { connectionString: raw, dialect } = await req.json();
        if (!raw) {
            return NextResponse.json({ error: "Connection string required" }, { status: 400 });
        }

        let connectionString: string;
        try {
            connectionString = sanitizeConnectionString(raw);
        } catch (e: any) {
            return NextResponse.json({ error: e.message }, { status: 400 });
        }

        // ── Test the connection ────────────────────────────────────────────
        try {
            const testPool = new Pool({
                connectionString,
                ssl: { rejectUnauthorized: false },
                connectionTimeoutMillis: 8000,
            });
            await testPool.query("SELECT 1");
            await testPool.end();
        } catch (e: any) {
            if (process.env.NODE_ENV !== "production") {
                console.error("DB test connection failed:", e);
            }
            const friendly = formatDatabaseError(e);
            return NextResponse.json(
                { error: friendly.friendlyMessage, suggestion: friendly.suggestion, originalError: friendly.message },
                { status: 400 }
            );
        }

        // ── Resolve the user id reliably ───────────────────────────────────
        const userId = await getDbUserId(session);
        if (!userId) {
            return NextResponse.json(
                { error: "Your account was not found. Please sign out and sign back in." },
                { status: 400 }
            );
        }

        // ── Check Permissions (Read-only Warning) ────────────────────────
        let hasWriteAccess = false;
        try {
            const permPool = new Pool({
                connectionString,
                ssl: { rejectUnauthorized: false },
                connectionTimeoutMillis: 5000,
            });
            // Very simple check: does the user have INSERT/UPDATE/DELETE privileges on ANY table in public schema?
            // A more robust check might look at role attributes, but this works for standard setups.
            const permRes = await permPool.query(`
                SELECT privilege_type 
                FROM information_schema.role_table_grants 
                WHERE grantee = current_user 
                AND privilege_type IN ('INSERT', 'UPDATE', 'DELETE')
                LIMIT 1
            `);
            if (permRes.rows.length > 0) {
                hasWriteAccess = true;
            }
            await permPool.end();
        } catch {
            // Ignore permission check errors
        }

        // ── Store encrypted connection string ──────────────────────────────
        const encrypted = encrypt(connectionString);
        const newName = `Connection ${Math.floor(Math.random() * 1000)}`;
        
        // Check if it's the first connection
        const count = await prisma.dbConnection.count({ where: { userId } });
        const isDefault = count === 0;

        await prisma.dbConnection.create({
            data: {
                userId,
                name: newName,
                dbConnectionString: encrypted,
                dbDialect: dialect || "postgresql",
                isDefault,
            },
        });

        // ── Fetch a quick preview of the connected database ────────────────
        let tableCount = 0;
        let tableNames: string[] = [];
        try {
            const previewPool = new Pool({
                connectionString,
                ssl: { rejectUnauthorized: false },
                connectionTimeoutMillis: 5000,
            });
            const tablesRes = await previewPool.query(`
                SELECT table_name
                FROM information_schema.tables
                WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
                ORDER BY table_name
                LIMIT 20
            `);
            tableNames = tablesRes.rows.map((r: any) => r.table_name as string);
            tableCount = tableNames.length;
            // Check if there are more than 20
            const countRes = await previewPool.query(`
                SELECT COUNT(*) AS cnt
                FROM information_schema.tables
                WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
            `);
            tableCount = parseInt(countRes.rows[0]?.cnt ?? "0", 10);
            await previewPool.end();
        } catch {
            // non-fatal — we already verified the connection above
        }

        return NextResponse.json({
            success: true,
            message: "Database connected successfully", hasWriteAccess,
            tableCount,
            tableNames,
        });
    } catch (error: any) {
        if (process.env.NODE_ENV !== "production") {
            console.error("Database connection endpoint error:", error);
        }
        return NextResponse.json(
            { error: error.message || "Failed to verify database connection" },
            { status: 500 }
        );
    }
}

export async function DELETE() {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const userId = await getDbUserId(session);
        if (!userId) {
            return NextResponse.json(
                { error: "Your account was not found. Please sign out and sign back in." },
                { status: 400 }
            );
        }

        // Need a connectionId to delete, but for now we'll just delete all for simplicity or expect a body.
        // Wait, DELETE methods don't normally have a body. Let's just delete the default one or all?
        // Let's delete all for this basic refactor to keep existing UI functional if they just hit disconnect.
        await prisma.dbConnection.deleteMany({
            where: { userId },
        });

        return NextResponse.json({ success: true, message: "Database disconnected" });
    } catch (error: any) {
        if (process.env.NODE_ENV !== "production") {
            console.error("Database disconnect error:", error);
        }
        return NextResponse.json(
            { error: error.message || "Failed to disconnect database" },
            { status: 500 }
        );
    }
}
