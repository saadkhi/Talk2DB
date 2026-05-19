import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { encrypt } from "@/lib/encryption";
import { Pool } from "pg";
import { formatDatabaseError } from "@/lib/errorFormatter";

export async function POST(req: Request) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { connectionString, dialect } = await req.json();
        if (!connectionString) {
            return NextResponse.json({ error: "Connection string required" }, { status: 400 });
        }

        // Test connection first
        try {
            const testPool = new Pool({
                connectionString,
                ssl: { rejectUnauthorized: false },
                connectionTimeoutMillis: 5000,
            });
            await testPool.query("SELECT 1");
            await testPool.end();
        } catch (e: any) {
            console.error("DB Test connection failed:", e);
            const friendly = formatDatabaseError(e);
            return NextResponse.json(
                {
                    error: friendly.friendlyMessage,
                    suggestion: friendly.suggestion,
                    originalError: friendly.message
                },
                { status: 400 }
            );
        }

        const encrypted = encrypt(connectionString);
        const userId = (session.user as any).id;

        await prisma.user.update({
            where: { id: userId },
            data: {
                dbConnectionString: encrypted,
                dbDialect: dialect || "postgresql",
            },
        });

        return NextResponse.json({
            success: true,
            message: "Database connected successfully",
        });
    } catch (error: any) {
        console.error("Database connection endpoint error:", error);
        return NextResponse.json({ error: error.message || "Failed to verify database connection" }, { status: 500 });
    }
}
