"use client";
/**
 * GuestDbBanner
 *
 * Replaces the "Connect Database" button for unauthenticated users.
 * Shows a locked state with a sign-in / register prompt.
 */

import React, { useState } from "react";
import { useRouter } from "next/navigation";

export default function GuestDbBanner() {
    const router = useRouter();
    const [hovered, setHovered] = useState(false);

    return (
        <div style={{
            display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
            gap: "16px", textAlign: "center",
            padding: "32px 24px",
            borderRadius: "16px",
            background: "rgba(99,102,241,0.05)",
            border: "1px dashed rgba(99,102,241,0.25)",
        }}>
            {/* Lock icon */}
            <div style={{
                width: "52px", height: "52px", borderRadius: "14px",
                background: "rgba(99,102,241,0.1)", border: "1px solid rgba(99,102,241,0.2)",
                display: "flex", alignItems: "center", justifyContent: "center",
            }}>
                <svg width="22" height="22" fill="none" stroke="#818cf8" strokeWidth="1.8" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round"
                        d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
                </svg>
            </div>

            <div>
                <p style={{ fontSize: "14px", fontWeight: 700, color: "#fff", margin: "0 0 6px" }}>
                    Database Connection Locked
                </p>
                <p style={{ fontSize: "12px", color: "#6B7280", lineHeight: 1.6, margin: 0, maxWidth: "300px" }}>
                    Connect your own database after creating a free account.
                    You're currently exploring with a demo dataset.
                </p>
            </div>

            <div style={{ display: "flex", gap: "10px" }}>
                <button
                    onClick={() => router.push("/auth/register")}
                    onMouseEnter={() => setHovered(true)}
                    onMouseLeave={() => setHovered(false)}
                    style={{
                        padding: "9px 20px", borderRadius: "10px",
                        background: hovered ? "linear-gradient(135deg,#818cf8,#a78bfa)" : "linear-gradient(135deg,#6366f1,#8b5cf6)",
                        color: "#fff", fontSize: "13px", fontWeight: 700,
                        border: "none", cursor: "pointer",
                        boxShadow: "0 4px 14px rgba(99,102,241,0.3)",
                        transition: "all 0.15s",
                    }}
                >
                    Create Free Account
                </button>
                <button
                    onClick={() => router.push("/auth/login")}
                    style={{
                        padding: "9px 20px", borderRadius: "10px",
                        background: "rgba(255,255,255,0.04)",
                        border: "1px solid rgba(255,255,255,0.1)",
                        color: "#9CA3AF", fontSize: "13px", fontWeight: 600,
                        cursor: "pointer", transition: "all 0.15s",
                    }}
                    onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = "#fff"; }}
                    onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = "#9CA3AF"; }}
                >
                    Sign In
                </button>
            </div>
        </div>
    );
}
