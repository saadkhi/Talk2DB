import { Session } from "next-auth";
import prisma from "./prisma";

/**
 * Reliably resolve the database User.id from a NextAuth session.
 *
 * The JWT callback stores `user.id` as `token.id` on first sign-in, but
 * there are two scenarios where it can be missing:
 *
 *   1. The user signed in before the JWT callback was updated (stale session).
 *   2. An OAuth sign-in where the adapter creates the User row asynchronously
 *      and the id isn't yet propagated into the token.
 *
 * In both cases we fall back to a DB lookup by email — which is always
 * present in the session — and cache the result back into the session object
 * so downstream code can rely on it.
 *
 * Returns the resolved User.id string, or null if it cannot be determined.
 */
export async function resolveUserId(session: Session): Promise<string | null> {
    // Fast path: id is already in the session
    const idFromToken = (session.user as any)?.id as string | undefined;
    if (idFromToken) return idFromToken;

    // Slow path: look up by email
    const email = session.user?.email;
    if (!email) return null;

    try {
        const user = await prisma.user.findUnique({
            where: { email },
            select: { id: true },
        });
        if (user) {
            // Cache it so repeated calls in the same request are free
            (session.user as any).id = user.id;
            return user.id;
        }
    } catch {
        // DB unreachable — callers will return an appropriate error
    }

    return null;
}
