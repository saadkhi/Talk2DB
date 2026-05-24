if (process.env.DATABASE_URL) {
    let url = process.env.DATABASE_URL.trim();
    if (url.startsWith('"') && url.endsWith('"')) {
        url = url.slice(1, -1);
    }
    if (url.startsWith("'") && url.endsWith("'")) {
        url = url.slice(1, -1);
    }
    process.env.DATABASE_URL = url.trim();
}

import { PrismaClient } from '@prisma/client'

const prismaClientSingleton = () => {
    console.log("--- PRISMA DIAGNOSTICS ---");
    console.log("DATABASE_URL type:", typeof process.env.DATABASE_URL);
    console.log("DATABASE_URL defined:", !!process.env.DATABASE_URL);
    if (process.env.DATABASE_URL) {
        console.log("DATABASE_URL length:", process.env.DATABASE_URL.length);
        console.log("DATABASE_URL prefix:", process.env.DATABASE_URL.substring(0, 20));
        if (!process.env.DATABASE_URL.startsWith("postgresql://") && !process.env.DATABASE_URL.startsWith("postgres://")) {
            console.error("CRITICAL: DATABASE_URL missing correct protocol!");
        }
    } else {
        console.error("CRITICAL: DATABASE_URL is UNDEFINED or EMPTY.");
    }
    console.log("--------------------------");
    return new PrismaClient({
        datasources: {
            db: {
                url: process.env.DATABASE_URL || undefined
            }
        }
    })
}

declare global {
    var prismaGlobal: undefined | ReturnType<typeof prismaClientSingleton>
}

const prisma = globalThis.prismaGlobal ?? prismaClientSingleton()

export default prisma

if (process.env.NODE_ENV !== 'production') globalThis.prismaGlobal = prisma
