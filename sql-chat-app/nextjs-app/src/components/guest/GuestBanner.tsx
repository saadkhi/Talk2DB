"use client";
/**
 * GuestBanner
 *
 * Thin top-of-page banner shown to unauthenticated users inside the dashboard.
 * Shows remaining free tries for the current tool and a login/register link.
 */

import React from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { useGuest, GuestTool, MAX_TRIALS } from "@/context/GuestContext";

interface Props {
    tool: GuestTool;
}

export default function GuestBanner({ tool }: Props) {
    const { status } = useSession();
    const { trials } = useGuest();

    // Only render for unauthenticated users
    if (status === "authenticated" || status === "loading") return null;

    const used = trials[tool] ?? 0;
    const remaining = Math.max(0, MAX_TRIALS - used);

    return (
        <div style={{
            display: "flex", alignItems: "center", justifyContent: "space-between",
            gap: "12px", flexWrap: "wrap",
            padding: "10px 16px",
            borderRadius: "12px",
            background: remaining === 0
                ? "rgba(239,68,68,0.08)"
                : remaining === 1
                    ? "rgba(245,158,11,0.08)"
                    : "rgba(99,102,241,0.07)",
            border: `1px solid ${remaining === 0
                ? "rgba(239,68,68,0.2)"
                : remaining === 1
                    ? "rgba(245,158,11,0.2)"
                    : "rgba(99,102,241,0.18)"}`,
            marginBottom: "16px",
        }}>
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                {/* Icon */}
                <svg width="14" height="14" fill="none" stroke={remaining === 0 ? "#f87171" : remaining === 1 ? "#fbbf24" : "#818cf8"} strokeWidth="2" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round"
                        d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
                </svg>
                <span style={{
                    fontSize: "12px", fontWeight: 600,
                    color: remaining === 0 ? "#f87171" : remaining === 1 ? "#fbbf24" : "#a5b4fc",
                }}>
                    {remaining === 0
                        ? "Free tries exhausted — sign up to continue"
                        : `Guest mode · ${remaining} free ${remaining === 1 ? "try" : "tries"} remaining on this tool`}
                </span>
                {/* Dots indicator */}
                <div style={{ display: "flex", gap: "3px", marginLeft: "4px" }}>
                    {Array.from({ length: MAX_TRIALS }).map((_, i) => (
                        <div key={i} style={{
                            width: "7px", height: "7px", borderRadius: "50%",
                            background: i < used
                                ? (remaining === 0 ? "#f87171" : "#fbbf24")
                                : "rgba(255,255,255,0.12)",
                            transition: "background 0.2s",
                        }} />
                    ))}
                </div>
            </div>

            {/* Auth links */}
            <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
                <span style={{ fontSize: "11px", color: "#4B5563" }}>Using demo data</span>
                <Link href="/auth/login" style={{
                    fontSize: "12px", fontWeight: 700, color: "#818cf8",
                    padding: "4px 12px", borderRadius: "7px",
                    background: "rgba(99,102,241,0.1)", border: "1px solid rgba(99,102,241,0.2)",
                    textDecoration: "none", transition: "all 0.15s",
                }}>
                    Sign In
                </Link>
                <Link href="/auth/register" style={{
                    fontSize: "12px", fontWeight: 700, color: "#fff",
                    padding: "4px 12px", borderRadius: "7px",
                    background: "linear-gradient(135deg,#6366f1,#8b5cf6)",
                    textDecoration: "none",
                }}>
                    Register Free
                </Link>
            </div>
        </div>
    );
}
