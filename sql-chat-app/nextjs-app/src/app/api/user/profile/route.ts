import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import bcrypt from "bcryptjs";
import type { Session } from "next-auth";

/** Resolve the real DB user from a session, using email as a fallback. */
async function resolveUser(session: Session) {
    const tokenId = (session.user as any).id as string | undefined;

    // Try by id first
    if (tokenId) {
        const user = await prisma.user.findUnique({
            where: { id: tokenId },
            select: { id: true, name: true, email: true, dbConnectionString: true, dbDialect: true, password: true },
        });
        if (user) return user;
    }

    // Fallback: look up by email
    const email = session.user?.email;
    if (email) {
        return prisma.user.findUnique({
            where: { email },
            select: { id: true, name: true, email: true, dbConnectionString: true, dbDialect: true, password: true },
        });
    }

    return null;
}

export async function GET() {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const user = await resolveUser(session);

        if (!user) {
            // Session exists but no DB row yet (e.g. OAuth race condition)
            return NextResponse.json({
                id: (session.user as any).id ?? null,
                name: session.user.name ?? null,
                email: session.user.email ?? null,
                dbConnectionString: null,
                dbDialect: null,
            });
        }

        return NextResponse.json({
            id: user.id,
            name: user.name,
            email: user.email,
            // Never expose the encrypted value — just signal presence
            dbConnectionString: user.dbConnectionString ? "[ENCRYPTED_CONNECTION_STRING]" : null,
            dbDialect: user.dbDialect,
        });
    } catch (error: any) {
        if (process.env.NODE_ENV !== "production") console.error("Profile GET error:", error);
        return NextResponse.json({ error: error.message || "Failed to fetch profile" }, { status: 500 });
    }
}

export async function PATCH(req: Request) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const user = await resolveUser(session);
        if (!user) {
            return NextResponse.json({ error: "Account not found. Please sign out and sign back in." }, { status: 404 });
        }

        const body = await req.json();
        const { name, currentPassword, newPassword } = body;
        const updateData: Record<string, any> = {};

        if (name !== undefined) {
            if (!name.trim()) return NextResponse.json({ error: "Name cannot be empty" }, { status: 400 });
            updateData.name = name.trim();
        }

        if (newPassword !== undefined) {
            if (!currentPassword) return NextResponse.json({ error: "Current password is required" }, { status: 400 });
            if (newPassword.length < 8) return NextResponse.json({ error: "New password must be at least 8 characters" }, { status: 400 });
            if (!user.password) return NextResponse.json({ error: "Cannot change password for OAuth accounts" }, { status: 400 });

            const valid = await bcrypt.compare(currentPassword, user.password);
            if (!valid) return NextResponse.json({ error: "Current password is incorrect" }, { status: 400 });

            updateData.password = await bcrypt.hash(newPassword, 12);
        }

        if (Object.keys(updateData).length === 0) {
            return NextResponse.json({ error: "Nothing to update" }, { status: 400 });
        }

        const updated = await prisma.user.update({
            where: { id: user.id },
            data: updateData,
            select: { id: true, name: true, email: true },
        });

        return NextResponse.json({ success: true, user: updated });
    } catch (error: any) {
        if (process.env.NODE_ENV !== "production") console.error("Profile PATCH error:", error);
        return NextResponse.json({ error: error.message || "Failed to update profile" }, { status: 500 });
    }
}
