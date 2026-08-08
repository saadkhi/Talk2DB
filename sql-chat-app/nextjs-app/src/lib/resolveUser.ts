import type { Session } from "next-auth";
import { cookies } from "next/headers";
import prisma from "./prisma";

export type UserWithDb = {
    id: string;
    email: string | null;
    name: string | null;
    dbConnectionString: string | null;
    dbDialect: string | null;
    connections: any[];
};

export async function resolveUserWithDb(session: Session, connectionId?: string | null): Promise<UserWithDb | null> {
    const tokenId = (session.user as any)?.id as string | undefined;
    const email   = session.user?.email ?? null;

    if (!tokenId && !email) return null;

    let user = null;
    if (tokenId) {
        user = await prisma.user.findUnique({
            where: { id: tokenId },
            select: { id: true, email: true, name: true, connections: true },
        });
    }

    if (!user && email) {
        user = await prisma.user.findUnique({
            where: { email },
            select: { id: true, email: true, name: true, connections: true },
        });
    }

    if (!user) return null;

    let activeConn = null;
    let finalConnectionId = connectionId;

    if (!finalConnectionId) {
        const cookieStore = await cookies();
        finalConnectionId = cookieStore.get("talk2db_active_connection")?.value;
    }

    if (finalConnectionId) {
        activeConn = user.connections.find((c: any) => c.id === finalConnectionId);
    } 
    
    if (!activeConn && user.connections.length > 0) {
        activeConn = user.connections.find((c: any) => c.isDefault) || user.connections[0];
    }

    return {
        id: user.id,
        email: user.email,
        name: user.name,
        dbConnectionString: activeConn?.dbConnectionString ?? null,
        dbDialect: activeConn?.dbDialect ?? null,
        connections: user.connections,
    };
}

export async function resolveUserId(session: Session): Promise<string | null> {
    const user = await resolveUserWithDb(session);
    return user?.id ?? null;
}
