/**
 * resolveUser.ts — Single source of truth for resolving the authenticated user.
 *
 * Strategy:
 *  1. Try lookup by JWT token.id first (fast path).
 *  2. If that user has no dbConnectionString but the email-matched user does,
 *     use the email-matched user (handles DB migrations / id mismatches).
 *  3. Always fall back to email lookup when id lookup fails.
 */
import type { Session } from "next-auth";
import prisma from "./prisma";

type UserWithDb = {
    id: string;
    email: string | null;
    name: string | null;
    dbConnectionString: string | null;
    dbDialect: string | null;
};

export async function resolveUserWithDb(session: Session): Promise<UserWithDb | null> {
    const tokenId = (session.user as any)?.id as string | undefined;
    const email   = session.user?.email ?? null;

    let byId: UserWithDb | null = null;
    let byEmail: UserWithDb | null = null;

    // Look up by token id
    if (tokenId) {
        byId = await prisma.user.findUnique({
            where: { id: tokenId },
            select: { id: true, email: true, name: true, dbConnectionString: true, dbDialect: true },
        });
    }

    // Look up by email (only if needed — different id or no result)
    if (email && (!byId || !byId.dbConnectionString)) {
        byEmail = await prisma.user.findUnique({
            where: { email },
            select: { id: true, email: true, name: true, dbConnectionString: true, dbDialect: true },
        });
    }

    // Prefer whichever has dbConnectionString
    if (byId?.dbConnectionString) return byId;
    if (byEmail?.dbConnectionString) return byEmail;

    // Neither has a connection — return whichever user record exists
    return byId ?? byEmail ?? null;
}

export async function resolveUserId(session: Session): Promise<string | null> {
    const user = await resolveUserWithDb(session);
    return user?.id ?? null;
}
