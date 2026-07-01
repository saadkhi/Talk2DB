import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";

export async function GET(req: Request) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const userId = (session.user as any).id;
        const user = await prisma.user.findUnique({
            where: { id: userId },
            select: {
                id: true,
                name: true,
                email: true,
                dbConnectionString: true,
                dbDialect: true,
            },
        });

        if (!user) {
            return NextResponse.json({
                id: userId,
                name: session.user.name,
                email: session.user.email,
                dbConnectionString: null,
                dbDialect: "postgresql",
            });
        }

        return NextResponse.json({
            id: user.id,
            name: user.name,
            email: user.email,
            dbConnectionString: user.dbConnectionString ? "[ENCRYPTED_CONNECTION_STRING]" : null,
            dbDialect: user.dbDialect,
        });
    } catch (error: any) {
        if (process.env.NODE_ENV !== 'production') {
            console.error("Profile fetch error:", error);
        }
        return NextResponse.json({ error: error.message || "Failed to fetch profile" }, { status: 500 });
    }
}
