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

                    <form onSubmit={handleSubmit} className={styles.form}>
                        {error && <div style={{ color: "var(--danger)", fontSize: "13px" }}>{error}</div>}

                        <div className={styles.inputGroup}>
                            <label className={styles.label}>Email Address</label>
                            <input
                                type="email"
                                className={`${styles.input} ${styles.inputMono}`}
                                placeholder="name@company.com"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                required
                            />
                        </div>

                        <div className={styles.inputGroup}>
                            <label className={styles.label}>Password</label>
                            <input
                                type="password"
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
