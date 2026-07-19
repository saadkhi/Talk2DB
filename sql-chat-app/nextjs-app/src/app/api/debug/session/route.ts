import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";

export async function GET() {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
        return NextResponse.json({ error: "No session" }, { status: 401 });
    }

    const tokenId = (session.user as any).id;
    const email = session.user.email;

    // Look up by both methods
    const byId = tokenId ? await prisma.user.findUnique({
        where: { id: tokenId },
        select: { id: true, email: true, dbConnectionString: true },
    }) : null;

    const byEmail = email ? await prisma.user.findUnique({
        where: { email },
        select: { id: true, email: true, dbConnectionString: true },
    }) : null;

    return NextResponse.json({
        session: {
            tokenId,
            email,
            name: session.user.name,
        },
        byId: byId ? { id: byId.id, email: byId.email, hasDb: !!byId.dbConnectionString } : null,
        byEmail: byEmail ? { id: byEmail.id, email: byEmail.email, hasDb: !!byEmail.dbConnectionString } : null,
        mismatch: byId?.id !== byEmail?.id,
    });
}
