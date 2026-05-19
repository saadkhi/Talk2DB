import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import prisma from "@/lib/prisma";

export async function POST(req: Request) {
    try {
        const { name, email, password } = await req.json();
        if (!email || !password) return NextResponse.json({ error: "Missing fields" }, { status: 400 });

        const existing = await prisma.user.findUnique({ where: { email } });
        if (existing) return NextResponse.json({ error: "Email already registered" }, { status: 409 });

        const hashed = await bcrypt.hash(password, 12);
        const user = await prisma.user.create({
            data: {
                name,
                email,
                password: hashed,
            },
        });

        return NextResponse.json({ id: user.id, email: user.email });
    } catch (error: any) {
        console.error("Registration error:", error);
        return NextResponse.json({ error: error.message || "Failed to register user" }, { status: 500 });
    }
}
