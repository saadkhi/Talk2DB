import { PrismaClient } from '@prisma/client'

const prismaClientSingleton = () => {
    const url = process.env.DATABASE_URL;
    if (!url) {
        console.error("DATABASE_URL is not defined. Please check your environment variables.");
    } else if (!url.startsWith("postgresql://") && !url.startsWith("postgres://")) {
        console.error("DATABASE_URL must start with 'postgresql://' or 'postgres://'. Current value starts with:", url.substring(0, 10));
    }
    return new PrismaClient()
}

declare global {
    var prismaGlobal: undefined | ReturnType<typeof prismaClientSingleton>
}

const prisma = globalThis.prismaGlobal ?? prismaClientSingleton()

export default prisma

if (process.env.NODE_ENV !== 'production') globalThis.prismaGlobal = prisma
