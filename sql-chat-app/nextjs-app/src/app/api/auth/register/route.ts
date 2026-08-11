import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import prisma from "@/lib/prisma";
import { sendVerificationEmail } from "@/lib/mailer";

/** Generate a cryptographically random 6-digit OTP */
function generateOTP(): string {
    return String(Math.floor(100000 + Math.random() * 900000));
}

export async function POST(req: Request) {
    try {
        const { name, email, password } = await req.json();
        if (!email || !password) {
            return NextResponse.json({ error: "Missing fields" }, { status: 400 });
        }

        const existing = await prisma.user.findUnique({ where: { email } });

        // If user exists but is already verified, reject
        if (existing?.emailVerified) {
            return NextResponse.json({ error: "Email already registered" }, { status: 409 });
        }

        const otp = generateOTP();
        const otpHash = await bcrypt.hash(otp, 10);
        const expiry = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes
        const hashedPassword = await bcrypt.hash(password, 12);

        let user;
        if (existing) {
            // Re-registration of unverified account — update credentials + new OTP
            user = await prisma.user.update({
                where: { email },
                data: {
                    name,
                    password: hashedPassword,
                    verifyCode: otpHash,
                    verifyCodeExpiry: expiry,
                    emailVerified: null,
                },
            });
        } else {
            user = await prisma.user.create({
                data: {
                    name,
                    email,
                    password: hashedPassword,
                    verifyCode: otpHash,
                    verifyCodeExpiry: expiry,
                    emailVerified: null,
                },
            });
        }

        // Send OTP email (non-blocking — don't fail registration if email fails)
        try {
            await sendVerificationEmail(email, name ?? null, otp);
        } catch (emailErr: any) {
            console.error("[mailer] Failed to send verification email:", emailErr.message);
            // Still return success — user can resend from the verify page
        }

        return NextResponse.json({
            id: user.id,
            email: user.email,
            requiresVerification: true,
        });
    } catch (error: any) {
        if (process.env.NODE_ENV !== "production") {
            console.error("Registration error:", error);
        }
        return NextResponse.json({ error: error.message || "Failed to register user" }, { status: 500 });
    }
}
