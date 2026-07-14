"use client";

import React, { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import SchemaConstellation from "@/components/SchemaConstellation";
import styles from "../Auth.module.css";

export default function LoginPage() {
    const router = useRouter();
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [error, setError] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);
    const [githubLoading, setGithubLoading] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!email || !password) {
            setError("Please fill in all fields.");
            return;
        }
        setError(null);
        setLoading(true);

        try {
            const res = await signIn("credentials", {
                redirect: false,
                email,
                password,
            });

            if (res?.error) {
                setError("Invalid email or password.");
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
                    <h1 className={styles.heading}>Sign in to Talk2DB</h1>
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
                        {githubLoading ? "Redirecting…" : "Continue with GitHub"}
                    </button>

                    {/* Divider */}
                    <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "16px" }}>
                        <div style={{ flex: 1, height: "1px", background: "rgba(255,255,255,0.08)" }} />
                        <span style={{ fontSize: "11px", color: "#4B5563", fontWeight: 600 }}>or sign in with email</span>
                        <div style={{ flex: 1, height: "1px", background: "rgba(255,255,255,0.08)" }} />
                    </div>

                    <form onSubmit={handleSubmit} className={styles.form}>
                        {error && <div style={{ color: "var(--danger)", fontSize: "13px" }}>{error}</div>}

                        <div className={styles.inputGroup}>
                            <label htmlFor="login-email" className={styles.label}>Email Address</label>
                            <input
                                id="login-email"
                                type="email"
                                autoComplete="email"
                                className={`${styles.input} ${styles.inputMono}`}
                                placeholder="name@company.com"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                required
                            />
                        </div>

                        <div className={styles.inputGroup}>
                            <label htmlFor="login-password" className={styles.label}>Password</label>
                            <input
                                id="login-password"
                                type="password"
                                autoComplete="current-password"
                                className={styles.input}
                                placeholder="••••••••"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                required
                            />
                        </div>

                        <button type="submit" className={styles.submitBtn} disabled={loading}>
                            {loading ? "Signing In..." : "Sign In"}
                            <div className={styles.shimmer}></div>
                        </button>
                    </form>

                    <div className={styles.switchLink}>
                        Don't have an account?
                        <Link href="/auth/register" className={styles.link}>Register</Link>
                    </div>

                    <div className={styles.pills}>
                        <span className={styles.pill}>Natural language → SQL</span>
                        <span className={styles.pill}>Instant results</span>
                        <span className={styles.pill}>Chat history</span>
                    </div>
                </div>
            </div>
        </div>
    );
}
