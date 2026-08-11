/**
 * POST /api/auth/resend-code
 *
 * Body: { email: string }
 *
 * Regenerates OTP and resends verification email.
 * Rate-limited to once per 60 seconds per email.
 */
import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import prisma from "@/lib/prisma";
import { sendVerificationEmail } from "@/lib/mailer";

function generateOTP(): string {
    return String(Math.floor(100000 + Math.random() * 900000));
}

export async function POST(req: Request) {
    try {
        const { email } = await req.json();
        if (!email) return NextResponse.json({ error: "Email is required" }, { status: 400 });

        const user = await prisma.user.findUnique({
            where: { email },
            select: { id: true, name: true, emailVerified: true, verifyCodeExpiry: true },
        });

        if (!user) return NextResponse.json({ error: "Account not found" }, { status: 404 });
        if (user.emailVerified) return NextResponse.json({ error: "Email is already verified" }, { status: 400 });

        // Rate limit: don't resend if current code was issued less than 60s ago
        // (verifyCodeExpiry is set to now + 15min, so if it's > 14min away, code is fresh)
        if (user.verifyCodeExpiry) {
            const issuedAgo = Date.now() - (user.verifyCodeExpiry.getTime() - 15 * 60 * 1000);
            if (issuedAgo < 60_000) {
                return NextResponse.json(
                    { error: "Please wait 60 seconds before requesting a new code." },
                    { status: 429 }
                );
            }
        }

        const otp = generateOTP();
        const otpHash = await bcrypt.hash(otp, 10);
        const expiry = new Date(Date.now() + 15 * 60 * 1000);

        await prisma.user.update({
            where: { email },
            data: { verifyCode: otpHash, verifyCodeExpiry: expiry },
        });

        await sendVerificationEmail(email, user.name ?? null, otp);

        return NextResponse.json({ success: true });
    } catch (err: any) {
        console.error("[resend-code]", err);
        return NextResponse.json({ error: err.message || "Failed to resend code" }, { status: 500 });
    }
}
