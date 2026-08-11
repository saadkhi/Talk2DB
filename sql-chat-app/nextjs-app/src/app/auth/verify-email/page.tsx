"use client";
import React, { useState, useRef, useEffect, useCallback, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { signIn } from "next-auth/react";
import Link from "next/link";
import SchemaConstellation from "@/components/SchemaConstellation";
import styles from "../Auth.module.css";

// ── Inner component that reads searchParams ───────────────────────────────────
function VerifyEmailInner() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const email = searchParams.get("email") ?? "";
    const password = searchParams.get("pw") ?? ""; // passed from register to auto sign-in

    const [digits, setDigits] = useState<string[]>(["", "", "", "", "", ""]);
    const [error, setError] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);
    const [success, setSuccess] = useState(false);

    // Resend cooldown
    const [cooldown, setCooldown] = useState(0);
    const [resending, setResending] = useState(false);
    const [resendMsg, setResendMsg] = useState<string | null>(null);

    const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

    // Start cooldown timer on mount (code was just sent)
    useEffect(() => {
        setCooldown(60);
    }, []);

    useEffect(() => {
        if (cooldown <= 0) return;
        const t = setTimeout(() => setCooldown(c => c - 1), 1000);
        return () => clearTimeout(t);
    }, [cooldown]);

    // Redirect if no email
    useEffect(() => {
        if (!email) router.replace("/auth/register");
    }, [email, router]);

    const focusNext = (idx: number) => {
        if (idx < 5) inputRefs.current[idx + 1]?.focus();
    };
    const focusPrev = (idx: number) => {
        if (idx > 0) inputRefs.current[idx - 1]?.focus();
    };

    const handleDigitChange = (idx: number, val: string) => {
        // Handle paste of full code
        if (val.length === 6 && /^\d{6}$/.test(val)) {
            const arr = val.split("");
            setDigits(arr);
            inputRefs.current[5]?.focus();
            return;
        }
        const digit = val.replace(/\D/g, "").slice(-1);
        const next = [...digits];
        next[idx] = digit;
        setDigits(next);
        if (digit) focusNext(idx);
    };

    const handleKeyDown = (idx: number, e: React.KeyboardEvent) => {
        if (e.key === "Backspace" && !digits[idx]) focusPrev(idx);
        if (e.key === "ArrowLeft") focusPrev(idx);
        if (e.key === "ArrowRight") focusNext(idx);
    };

    const handlePaste = (e: React.ClipboardEvent) => {
        e.preventDefault();
        const pasted = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6);
        if (pasted.length === 6) {
            setDigits(pasted.split(""));
            inputRefs.current[5]?.focus();
        }
    };

    const handleSubmit = useCallback(async (e?: React.FormEvent) => {
        e?.preventDefault();
        const code = digits.join("");
        if (code.length !== 6) {
            setError("Please enter all 6 digits.");
            return;
        }

        setLoading(true);
        setError(null);

        try {
            const res = await fetch("/api/auth/verify-email", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ email, code }),
            });
            const data = await res.json();

            if (!res.ok) {
                setError(data.error || "Verification failed.");
                setLoading(false);
                return;
            }

            setSuccess(true);

            // Auto sign-in if password was passed (from registration)
            if (password) {
                const loginRes = await signIn("credentials", {
                    redirect: false,
                    email,
                    password,
                });
                if (loginRes?.ok) {
                    router.push("/dashboard");
                    return;
                }
            }

            // Fallback: redirect to login
            setTimeout(() => router.push("/auth/login"), 1500);
        } catch {
            setError("Something went wrong. Please try again.");
            setLoading(false);
        }
    }, [digits, email, password, router]);

    // Auto-submit when all 6 digits filled
    useEffect(() => {
        if (digits.every(d => d !== "")) {
            handleSubmit();
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [digits]);

    const handleResend = async () => {
        if (cooldown > 0 || resending) return;
        setResending(true);
        setResendMsg(null);
        try {
            const res = await fetch("/api/auth/resend-code", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ email }),
            });
            const data = await res.json();
            if (!res.ok) {
                setResendMsg(data.error || "Failed to resend.");
            } else {
                setResendMsg("New code sent! Check your inbox.");
                setCooldown(60);
                setDigits(["", "", "", "", "", ""]);
                setError(null);
                inputRefs.current[0]?.focus();
            }
        } catch {
            setResendMsg("Failed to resend. Try again.");
        } finally {
            setResending(false);
        }
    };

    const digitBoxStyle = (filled: boolean): React.CSSProperties => ({
        width: "52px", height: "64px", textAlign: "center", fontSize: "28px",
        fontWeight: 800, fontFamily: "monospace",
        background: filled ? "rgba(99,102,241,0.12)" : "rgba(23,27,38,0.6)",
        border: `2px solid ${filled ? "rgba(99,102,241,0.5)" : "rgba(255,255,255,0.1)"}`,
        borderRadius: "12px", color: "#fff", outline: "none",
        transition: "all 0.15s", caretColor: "#6366f1",
    });

    return (
        <div className={styles.page}>
            <div className={styles.leftPanel}>
                <div className={styles.wordmark}>Talk2DB</div>
                <SchemaConstellation />
            </div>

            <div className={styles.rightPanel}>
                <div className={styles.formCard}>
                    {/* Icon */}
                    <div style={{
                        width: "52px", height: "52px", borderRadius: "14px",
                        background: "linear-gradient(135deg,#6366f1,#8b5cf6)",
                        display: "flex", alignItems: "center", justifyContent: "center",
                        marginBottom: "24px", boxShadow: "0 8px 24px rgba(99,102,241,0.3)",
                    }}>
                        <svg width="24" height="24" fill="none" stroke="white" strokeWidth="2.5" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75" />
                        </svg>
                    </div>

                    {success ? (
                        <div style={{ textAlign: "center" }}>
                            <div style={{ width: "56px", height: "56px", borderRadius: "50%", background: "rgba(16,185,129,0.15)", border: "2px solid #10b981", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 16px" }}>
                                <svg width="28" height="28" fill="none" stroke="#10b981" strokeWidth="2.5" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                                </svg>
                            </div>
                            <h2 className={styles.heading} style={{ fontSize: "22px" }}>Email verified!</h2>
                            <p style={{ color: "#9CA3AF", fontSize: "14px" }}>Redirecting to dashboard…</p>
                        </div>
                    ) : (
                        <>
                            <h1 className={styles.heading} style={{ fontSize: "24px", marginBottom: "8px" }}>Check your email</h1>
                            <p style={{ color: "#9CA3AF", fontSize: "13px", lineHeight: 1.6, marginBottom: "28px" }}>
                                We sent a 6-digit code to<br />
                                <strong style={{ color: "#D1D5DB" }}>{email}</strong>
                                <br />Enter it below to verify your account.
                            </p>

                            <form onSubmit={handleSubmit}>
                                {/* OTP digit boxes */}
                                <div style={{ display: "flex", gap: "8px", justifyContent: "center", marginBottom: "20px" }} onPaste={handlePaste}>
                                    {digits.map((d, i) => (
                                        <input
                                            key={i}
                                            ref={el => { inputRefs.current[i] = el; }}
                                            type="text"
                                            inputMode="numeric"
                                            maxLength={6}
                                            value={d}
                                            onChange={e => handleDigitChange(i, e.target.value)}
                                            onKeyDown={e => handleKeyDown(i, e)}
                                            onFocus={e => (e.currentTarget.style.borderColor = "#6366f1")}
                                            onBlur={e => (e.currentTarget.style.borderColor = d ? "rgba(99,102,241,0.5)" : "rgba(255,255,255,0.1)")}
                                            style={digitBoxStyle(d !== "")}
                                            disabled={loading}
                                            autoFocus={i === 0}
                                        />
                                    ))}
                                </div>

                                {error && (
                                    <div style={{ background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.2)", borderRadius: "8px", padding: "10px 14px", fontSize: "12px", color: "#f87171", marginBottom: "14px", textAlign: "center" }}>
                                        ⚠ {error}
                                    </div>
                                )}

                                {resendMsg && (
                                    <div style={{ background: "rgba(16,185,129,0.08)", border: "1px solid rgba(16,185,129,0.2)", borderRadius: "8px", padding: "10px 14px", fontSize: "12px", color: "#34d399", marginBottom: "14px", textAlign: "center" }}>
                                        ✓ {resendMsg}
                                    </div>
                                )}

                                <button type="submit" className={styles.submitBtn} disabled={loading || digits.some(d => d === "")}>
                                    {loading ? "Verifying…" : "Verify Email"}
                                    <div className={styles.shimmer} />
                                </button>
                            </form>

                            {/* Resend */}
                            <div style={{ textAlign: "center", marginTop: "20px" }}>
                                <p style={{ color: "#6B7280", fontSize: "13px", marginBottom: "8px" }}>Didn't receive the code?</p>
                                <button
                                    onClick={handleResend}
                                    disabled={cooldown > 0 || resending}
                                    style={{
                                        background: "none", border: "none", cursor: cooldown > 0 ? "not-allowed" : "pointer",
                                        color: cooldown > 0 ? "#4B5563" : "#6366f1", fontSize: "13px", fontWeight: 600,
                                        fontFamily: "inherit",
                                    }}
                                >
                                    {resending ? "Sending…" : cooldown > 0 ? `Resend code in ${cooldown}s` : "Resend code"}
                                </button>
                            </div>

                            <div className={styles.switchLink} style={{ marginTop: "28px" }}>
                                Wrong email?{" "}
                                <Link href="/auth/register" className={styles.link}>Go back</Link>
                            </div>

                            {/* Code expiry note */}
                            <p style={{ textAlign: "center", fontSize: "11px", color: "#374151", marginTop: "16px" }}>
                                Code expires in 15 minutes
                            </p>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
}

// ── Page export with Suspense (required for useSearchParams in Next.js App Router)
export default function VerifyEmailPage() {
    return (
        <Suspense fallback={
            <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "#060812" }}>
                <div style={{ width: "24px", height: "24px", border: "3px solid rgba(99,102,241,0.2)", borderTop: "3px solid #6366f1", borderRadius: "50%", animation: "spin 0.7s linear infinite" }} />
                <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
            </div>
        }>
            <VerifyEmailInner />
        </Suspense>
    );
}
