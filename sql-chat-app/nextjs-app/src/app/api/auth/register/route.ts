import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import prisma from "@/lib/prisma";
import { sendVerificationEmail } from "@/lib/mailer";

/** Generate a cryptographically random 6-digit OTP */
function generateOTP(): string {
    return String(Math.floor(100000 + Math.random() * 900000));
}

/** Map Prisma/DB error codes to friendly messages */
function getFriendlyError(err: any): string {
    const msg: string = err?.message ?? "";

    // Prisma unique constraint violation (email already exists)
    if (err?.code === "P2002") return "Email already registered.";

    // Column not found — migration not applied
    if (msg.includes("does not exist in the current database") || msg.includes("column") || err?.code === "P2022") {
        return "Database schema is being updated. Please try again in a moment.";
    }

    // Connection / timeout
    if (msg.includes("connect") || msg.includes("timeout") || err?.code === "P1001" || err?.code === "P1008") {
        return "Cannot reach the database. Please try again.";
    }

    // Generic fallback — never expose raw Prisma errors to users
    return "Registration failed. Please try again.";
}

export async function POST(req: Request) {
    // ── Parse & validate body ──────────────────────────────────────────────
    let name: string | undefined;
    let email: string | undefined;
    let password: string | undefined;

    try {
        const body = await req.json();
        name = (body.name ?? "").trim() || undefined;
        email = (body.email ?? "").trim().toLowerCase();
        password = body.password ?? "";
    } catch {
        return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
    }

    if (!email || !password) {
        return NextResponse.json({ error: "Email and password are required." }, { status: 400 });
    }

    if (password.length < 8) {
        return NextResponse.json({ error: "Password must be at least 8 characters." }, { status: 400 });
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
        return NextResponse.json({ error: "Please enter a valid email address." }, { status: 400 });
    }

    try {
        // ── Check for existing user ────────────────────────────────────────
        const existing = await prisma.user.findUnique({
            where: { email },
            select: { id: true, emailVerified: true },
        });

        // If verified account already exists, reject
        if (existing?.emailVerified) {
            return NextResponse.json({ error: "An account with this email already exists." }, { status: 409 });
        }

        // ── Generate OTP ───────────────────────────────────────────────────
        const otp = generateOTP();
        const otpHash = await bcrypt.hash(otp, 10);
        const expiry = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes
        const hashedPassword = await bcrypt.hash(password, 12);

        // ── Create or update user ──────────────────────────────────────────
        let user;
        if (existing) {
            // Unverified account re-registering — update credentials + fresh OTP
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

        // ── Send verification email ────────────────────────────────────────
        // Non-fatal — user can resend from the verify page if delivery fails
        let emailSent = true;
        try {
            await sendVerificationEmail(email, name ?? null, otp);
        } catch (emailErr: any) {
            emailSent = false;
            console.error("[register] Email delivery failed:", emailErr.message);
        }

        return NextResponse.json({
            id: user.id,
            email: user.email,
            requiresVerification: true,
            emailSent,
            // Surface a hint if email failed so the frontend can inform the user
            ...(!emailSent && {
                emailWarning: "We couldn't send the verification email right now. You can request a new code on the next page.",
            }),
        });
    } catch (err: any) {
        if (process.env.NODE_ENV !== "production") {
            console.error("[register] Error:", err);
        }
        const friendlyMessage = getFriendlyError(err);
        return NextResponse.json({ error: friendlyMessage }, { status: 500 });
    }
}
