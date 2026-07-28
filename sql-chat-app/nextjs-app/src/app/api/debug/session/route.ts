import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";

// FIX: this endpoint exposes internal session state (token id, email, DB connection
// presence, id mismatch) to any authenticated user. Restrict it to:
//   - development/test environments, OR
//   - the configured admin email in production.
// In production with no ADMIN_EMAIL set it returns 404 to avoid leaking its existence.
export async function GET() {
    const isProd = process.env.NODE_ENV === "production";
    const adminEmail = process.env.ADMIN_EMAIL;

    const session = await getServerSession(authOptions);

    if (isProd) {
        // In production: only the admin may call this endpoint
        if (!adminEmail) {
            // No admin configured — pretend the route doesn't exist
            return NextResponse.json({ error: "Not found" }, { status: 404 });
        }
        if (!session?.user || (session.user as any).email !== adminEmail) {
            return NextResponse.json({ error: "Forbidden" }, { status: 403 });
        }
    } else {
        // In development: still require authentication
        if (!session?.user) {
            return NextResponse.json({ error: "No session" }, { status: 401 });
        }
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
