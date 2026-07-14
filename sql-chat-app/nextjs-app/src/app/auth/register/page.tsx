"use client";

import React, { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import SchemaConstellation from "@/components/SchemaConstellation";
import styles from "../Auth.module.css";

export default function RegisterPage() {
    const router = useRouter();
    const [name, setName] = useState("");
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [error, setError] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);
    const [githubLoading, setGithubLoading] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!name || !email || !password || !confirmPassword) {
            setError("Please fill in all fields.");
            return;
        }
        if (password !== confirmPassword) {
            setError("Passwords do not match.");
            return;
        }
        setError(null);
        setLoading(true);
        try {
            const registerRes = await fetch("/api/auth/register", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ name, email, password }),
            });
            const data = await registerRes.json();
            if (!registerRes.ok) {
                setError(data.error || "Failed to register account.");
                setLoading(false);
                return;
            }
            const loginRes = await signIn("credentials", { redirect: false, email, password });
            if (loginRes?.error) {
                router.push("/auth/login");
            } else {
                router.refresh();
                router.push("/dashboard");
            }
        } catch (err) {
            console.error(err);
            setError("An unexpected error occurred. Please try again.");
        } finally {
            setLoading(false);
        }
    };

    const handleGitHub = async () => {
        setGithubLoading(true);
        await signIn("github", { callbackUrl: "/dashboard" });
    };

    return (
        <div className={styles.page}>
            <div className={styles.leftPanel}>
                <div className={styles.wordmark}>Talk2DB</div>
                <SchemaConstellation />
            </div>

            <div className={styles.rightPanel}>
                <div className={styles.formCard}>
                    <div className={styles.logoMonogram}>T2</div>
                    <h1 className={styles.heading}>Create an account</h1>
                    <p className={styles.subheading}>Your data, in plain English</p>

                    {/* GitHub OAuth button */}
                    <button
                        onClick={handleGitHub}
                        disabled={githubLoading}
                        style={{
                            width: "100%", display: "flex", alignItems: "center", justifyContent: "center",
                            gap: "10px", padding: "11px 16px", borderRadius: "10px", cursor: "pointer",
                            background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.12)",
                            color: "#fff", fontSize: "13px", fontWeight: 600, marginBottom: "16px",
                            transition: "all 0.15s", fontFamily: "inherit",
                            opacity: githubLoading ? 0.6 : 1,
                        }}
                        onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = "rgba(255,255,255,0.1)"}
                        onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = "rgba(255,255,255,0.05)"}
                    >
                        <svg width="18" height="18" fill="currentColor" viewBox="0 0 24 24">
                            <path d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" />
                        </svg>
                        {githubLoading ? "Redirecting…" : "Sign up with GitHub"}
                    </button>

                    {/* Divider */}
                    <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "16px" }}>
                        <div style={{ flex: 1, height: "1px", background: "rgba(255,255,255,0.08)" }} />
                        <span style={{ fontSize: "11px", color: "#4B5563", fontWeight: 600 }}>or register with email</span>
                        <div style={{ flex: 1, height: "1px", background: "rgba(255,255,255,0.08)" }} />
                    </div>

                    <form onSubmit={handleSubmit} className={styles.form}>
                        {error && <div style={{ color: "var(--danger)", fontSize: "13px" }}>{error}</div>}

                        <div className={styles.inputGroup}>
                            <label htmlFor="reg-name" className={styles.label}>Full Name</label>
                            <input id="reg-name" type="text" autoComplete="name"
                                className={styles.input} placeholder="John Doe"
                                value={name} onChange={e => setName(e.target.value)} required />
                        </div>

                        <div className={styles.inputGroup}>
                            <label htmlFor="reg-email" className={styles.label}>Email Address</label>
                            <input id="reg-email" type="email" autoComplete="email"
                                className={`${styles.input} ${styles.inputMono}`} placeholder="name@company.com"
                                value={email} onChange={e => setEmail(e.target.value)} required />
                        </div>

                        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                            <div className={styles.inputGroup}>
                                <label htmlFor="reg-password" className={styles.label}>Password</label>
                                <input id="reg-password" type="password" autoComplete="new-password"
                                    className={styles.input} placeholder="••••••••"
                                    value={password} onChange={e => setPassword(e.target.value)} required />
                            </div>
                            <div className={styles.inputGroup}>
                                <label htmlFor="reg-confirm" className={styles.label}>Confirm</label>
                                <input id="reg-confirm" type="password" autoComplete="new-password"
                                    className={styles.input} placeholder="••••••••"
                                    value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} required />
                            </div>
                        </div>

                        <button type="submit" className={styles.submitBtn} disabled={loading}>
                            {loading ? "Creating Account..." : "Register"}
                            <div className={styles.shimmer}></div>
                        </button>
                    </form>

                    <div className={styles.switchLink}>
                        Already have an account?
                        <Link href="/auth/login" className={styles.link}>Sign In</Link>
                    </div>
                </div>
            </div>
        </div>
    );
}
