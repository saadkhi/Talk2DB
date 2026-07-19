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

        // ── Store encrypted connection string ──────────────────────────────
        const encrypted = encrypt(connectionString);
        await prisma.user.update({
            where: { id: userId },
            data: {
                dbConnectionString: encrypted,
                dbDialect: dialect || "postgresql",
            },
        });

        return NextResponse.json({ success: true, message: "Database connected successfully" });
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

        await prisma.user.update({
            where: { id: userId },
            data: { dbConnectionString: null, dbDialect: null },
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
