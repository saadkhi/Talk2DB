/**
 * POST /api/auth/verify-email
 *
 * Body: { email: string, code: string }
 *
 * Validates the 6-digit OTP, marks emailVerified, clears the code.
 * Returns { success: true } — the frontend then calls signIn() to get a session.
 */
import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import prisma from "@/lib/prisma";

export async function POST(req: Request) {
    try {
        const { email, code } = await req.json();

        if (!email || !code) {
            return NextResponse.json({ error: "Email and code are required" }, { status: 400 });
        }

        const user = await prisma.user.findUnique({
            where: { email },
            select: {
                id: true,
                verifyCode: true,
                verifyCodeExpiry: true,
                emailVerified: true,
            },
        });

        if (!user) {
            return NextResponse.json({ error: "Account not found" }, { status: 404 });
        }

        // Already verified
        if (user.emailVerified) {
            return NextResponse.json({ success: true, alreadyVerified: true });
        }

        if (!user.verifyCode || !user.verifyCodeExpiry) {
            return NextResponse.json(
                { error: "No verification code found. Please request a new code." },
                { status: 400 }
            );
        }

        // Check expiry
        if (new Date() > user.verifyCodeExpiry) {
            return NextResponse.json(
                { error: "Verification code has expired. Please request a new one." },
                { status: 410 }
            );
        }

        // Verify the OTP
        const isMatch = await bcrypt.compare(code.trim(), user.verifyCode);
        if (!isMatch) {
            return NextResponse.json(
                { error: "Incorrect code. Please check your email and try again." },
                { status: 400 }
            );
        }

        // Mark as verified and clear OTP
        await prisma.user.update({
            where: { email },
            data: {
                emailVerified: new Date(),
                verifyCode: null,
                verifyCodeExpiry: null,
            },
        });

        return NextResponse.json({ success: true });
    } catch (err: any) {
        console.error("[verify-email]", err);
        const msg: string = err?.message ?? "";
        if (msg.includes("does not exist in the current database")) {
            return NextResponse.json({ error: "Database is being updated. Please try again in a moment." }, { status: 503 });
        }
        return NextResponse.json({ error: "Verification failed. Please try again." }, { status: 500 });
    }
}
