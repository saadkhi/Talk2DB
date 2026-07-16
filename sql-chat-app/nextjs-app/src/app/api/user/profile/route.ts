import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import bcrypt from "bcryptjs";

export async function GET(req: Request) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const userId = (session.user as any).id;
        const user = await prisma.user.findUnique({
            where: { id: userId },
            select: { id: true, name: true, email: true, dbConnectionString: true, dbDialect: true },
        });

        if (!user) {
            return NextResponse.json({
                id: userId, name: session.user.name, email: session.user.email,
                dbConnectionString: null, dbDialect: "postgresql",
            });
        }

        return NextResponse.json({
            id: user.id, name: user.name, email: user.email,
            dbConnectionString: user.dbConnectionString ? "[ENCRYPTED_CONNECTION_STRING]" : null,
            dbDialect: user.dbDialect,
        });
    } catch (error: any) {
        if (process.env.NODE_ENV !== 'production') console.error("Profile fetch error:", error);
        return NextResponse.json({ error: error.message || "Failed to fetch profile" }, { status: 500 });
    }
}

export async function PATCH(req: Request) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const userId = (session.user as any).id;
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

            const user = await prisma.user.findUnique({ where: { id: userId }, select: { password: true } });
            if (!user?.password) return NextResponse.json({ error: "Cannot change password for OAuth accounts" }, { status: 400 });

            const valid = await bcrypt.compare(currentPassword, user.password);
            if (!valid) return NextResponse.json({ error: "Current password is incorrect" }, { status: 400 });

            updateData.password = await bcrypt.hash(newPassword, 12);
        }

        if (Object.keys(updateData).length === 0) {
            return NextResponse.json({ error: "Nothing to update" }, { status: 400 });
        }

        const updated = await prisma.user.update({
            where: { id: userId },
            data: updateData,
            select: { id: true, name: true, email: true },
        });

        return NextResponse.json({ success: true, user: updated });
    } catch (error: any) {
        if (process.env.NODE_ENV !== 'production') console.error("Profile update error:", error);
        return NextResponse.json({ error: error.message || "Failed to update profile" }, { status: 500 });
    }
}
