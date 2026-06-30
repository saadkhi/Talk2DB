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

            const loginRes = await signIn("credentials", {
                redirect: false,
                email,
                password,
            });

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

                    <form onSubmit={handleSubmit} className={styles.form}>
                        {error && <div style={{ color: "var(--danger)", fontSize: "13px" }}>{error}</div>}

                        <div className={styles.inputGroup}>
                            <label htmlFor="reg-name" className={styles.label}>Full Name</label>
                            <input
                                id="reg-name"
                                type="text"
                                autoComplete="name"
                                className={styles.input}
                                placeholder="John Doe"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                required
                            />
                        </div>

                        <div className={styles.inputGroup}>
                            <label htmlFor="reg-email" className={styles.label}>Email Address</label>
                            <input
                                id="reg-email"
                                type="email"
                                autoComplete="email"
                                className={`${styles.input} ${styles.inputMono}`}
                                placeholder="name@company.com"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                required
                            />
                        </div>

                        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                            <div className={styles.inputGroup}>
                                <label htmlFor="reg-password" className={styles.label}>Password</label>
                                <input
                                    id="reg-password"
                                    type="password"
                                    autoComplete="new-password"
                                    className={styles.input}
                                    placeholder="••••••••"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    required
                                />
                            </div>
                            <div className={styles.inputGroup}>
                                <label htmlFor="reg-confirm" className={styles.label}>Confirm</label>
                                <input
                                    id="reg-confirm"
                                    type="password"
                                    autoComplete="new-password"
                                    className={styles.input}
                                    placeholder="••••••••"
                                    value={confirmPassword}
                                    onChange={(e) => setConfirmPassword(e.target.value)}
                                    required
                                />
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
