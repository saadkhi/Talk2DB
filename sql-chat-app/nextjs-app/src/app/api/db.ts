import { PrismaClient } from '@prisma/client'

const prismaClientSingleton = () => {
    let url = process.env.DATABASE_URL || "";
    if (url.startsWith('"') && url.endsWith('"')) {
        url = url.slice(1, -1);
    }
    if (url.startsWith("'") && url.endsWith("'")) {
        url = url.slice(1, -1);
    }
    console.log("--- PRISMA DIAGNOSTICS ---");
    console.log("DATABASE_URL type:", typeof url);
    console.log("DATABASE_URL defined:", !!url);
    if (url) {
        console.log("DATABASE_URL length:", url.length);
        console.log("DATABASE_URL prefix:", url.substring(0, 20));
        if (!url.startsWith("postgresql://") && !url.startsWith("postgres://")) {
            console.error("CRITICAL: DATABASE_URL missing correct protocol!");
        }
    } else {
        console.error("CRITICAL: DATABASE_URL is UNDEFINED or EMPTY.");
    }
    console.log("--------------------------");
    return new PrismaClient({
        datasources: {
            db: {
                url: url || undefined
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
