import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";

// This endpoint exposes session debug info.
// In production it is restricted to the configured ADMIN_EMAIL.
export async function GET() {
    const isProd = process.env.NODE_ENV === "production";
    const adminEmail = process.env.ADMIN_EMAIL;

    const session = await getServerSession(authOptions);

    if (isProd) {
        if (!adminEmail) {
            return NextResponse.json({ error: "Not found" }, { status: 404 });
        }
        if (!session?.user || (session.user as any).email !== adminEmail) {
            return NextResponse.json({ error: "Forbidden" }, { status: 403 });
        }
    } else {
        if (!session?.user) {
            return NextResponse.json({ error: "No session" }, { status: 401 });
        }
    }

    const tokenId = (session.user as any).id;
    const email = session.user.email;

    // Look up by both methods — check connections separately
    const byId = tokenId
        ? await prisma.user.findUnique({
              where: { id: tokenId },
              select: { id: true, email: true, connections: { take: 1, select: { id: true } } },
          })
        : null;

    const byEmail = email
        ? await prisma.user.findUnique({
              where: { email },
              select: { id: true, email: true, connections: { take: 1, select: { id: true } } },
          })
        : null;

    return NextResponse.json({
        session: { tokenId, email, name: session.user.name },
        byId: byId ? { id: byId.id, email: byId.email, hasDb: byId.connections.length > 0 } : null,
        byEmail: byEmail ? { id: byEmail.id, email: byEmail.email, hasDb: byEmail.connections.length > 0 } : null,
        mismatch: byId?.id !== byEmail?.id,
    });
}
