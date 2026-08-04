"use client";
/**
 * GuestLimitModal
 *
 * Full-screen overlay shown when a guest user hits their free-trial limit
 * on any tool. Contains Login and Register buttons that navigate to /auth/login
 * and /auth/register respectively.
 */

import React from "react";
import { useRouter } from "next/navigation";
import { useGuest, GuestTool, MAX_TRIALS } from "@/context/GuestContext";

const TOOL_LABELS: Record<GuestTool, string> = {
    query: "Query Studio",
    visualizer: "Data Visualizer",
    report: "Report Builder",
    schema: "Schema Explorer",
    profiler: "Data Profiler",
    browser: "Database Browser",
};

export default function GuestLimitModal() {
    const { blockedTool, setBlockedTool } = useGuest();
    const router = useRouter();

    if (!blockedTool) return null;

    const toolLabel = TOOL_LABELS[blockedTool];

    const go = (path: string) => {
        setBlockedTool(null);
        router.push(path);
    };

    return (
        <>
            {/* Backdrop */}
            <div style={{
                position: "fixed", inset: 0, zIndex: 9000,
                background: "rgba(0,0,0,0.82)",
                backdropFilter: "blur(8px)",
                display: "flex", alignItems: "center", justifyContent: "center",
                padding: "20px",
            }}>
                {/* Card */}
                <div style={{
                    width: "100%", maxWidth: "440px",
                    background: "linear-gradient(145deg,#0d0f1a,#111320)",
                    border: "1px solid rgba(99,102,241,0.25)",
                    borderRadius: "20px",
                    padding: "36px 32px 28px",
                    boxShadow: "0 32px 80px rgba(0,0,0,0.7), 0 0 0 1px rgba(99,102,241,0.08)",
                    animation: "modalPop 0.25s cubic-bezier(0.16,1,0.3,1) forwards",
                    textAlign: "center",
                }}>
                    {/* Icon */}
                    <div style={{
                        width: "60px", height: "60px", borderRadius: "18px",
                        background: "linear-gradient(135deg,rgba(99,102,241,0.2),rgba(139,92,246,0.15))",
                        border: "1px solid rgba(99,102,241,0.3)",
                        display: "flex", alignItems: "center", justifyContent: "center",
                        margin: "0 auto 20px",
                    }}>
                        <svg width="26" height="26" fill="none" stroke="#818cf8" strokeWidth="1.8" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round"
                                d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
                        </svg>
                    </div>

                    {/* Heading */}
                    <h2 style={{
                        fontSize: "22px", fontWeight: 900, color: "#fff",
                        margin: "0 0 10px", letterSpacing: "-0.03em",
                    }}>
                        Free Tries Used Up
                    </h2>

                    {/* Body */}
                    <p style={{ fontSize: "14px", color: "#9CA3AF", lineHeight: 1.65, margin: "0 0 8px" }}>
                        You've used all <strong style={{ color: "#fff" }}>{MAX_TRIALS} free tries</strong> for{" "}
                        <strong style={{ color: "#a5b4fc" }}>{toolLabel}</strong>.
                    </p>
                    <p style={{ fontSize: "13px", color: "#6B7280", lineHeight: 1.6, margin: "0 0 28px" }}>
                        Create a free account to unlock unlimited queries, connect your own database,
                        and save your work — no credit card required.
                    </p>

                    {/* Perks */}
                    <div style={{
                        display: "flex", flexDirection: "column", gap: "8px",
                        margin: "0 0 28px",
                        padding: "16px",
                        background: "rgba(99,102,241,0.06)",
                        border: "1px solid rgba(99,102,241,0.15)",
                        borderRadius: "12px",
                        textAlign: "left",
                    }}>
                        {[
                            "Unlimited SQL generation & execution",
                            "Connect your own PostgreSQL / MySQL database",
                            "Save queries, reports & visualizations",
                            "Full query history & re-run",
                            "All 5 analyst tools unlocked",
                        ].map(perk => (
                            <div key={perk} style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                                <svg width="14" height="14" fill="none" stroke="#6366f1" strokeWidth="2.5" viewBox="0 0 24 24" style={{ flexShrink: 0 }}>
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                                </svg>
                                <span style={{ fontSize: "12px", color: "#D1D5DB" }}>{perk}</span>
                            </div>
                        ))}
                    </div>

                    {/* CTA buttons */}
                    <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                        <button
                            onClick={() => go("/auth/register")}
                            style={{
                                width: "100%", padding: "13px",
                                borderRadius: "12px", fontSize: "14px", fontWeight: 800,
                                background: "linear-gradient(135deg,#6366f1,#8b5cf6)",
                                color: "#fff", border: "none", cursor: "pointer",
                                boxShadow: "0 4px 18px rgba(99,102,241,0.4)",
                                transition: "filter 0.15s",
                            }}
                            onMouseEnter={e => (e.currentTarget as HTMLElement).style.filter = "brightness(1.12)"}
                            onMouseLeave={e => (e.currentTarget as HTMLElement).style.filter = "none"}
                        >
                            Create Free Account →
                        </button>
                        <button
                            onClick={() => go("/auth/login")}
                            style={{
                                width: "100%", padding: "11px",
                                borderRadius: "12px", fontSize: "13px", fontWeight: 700,
                                background: "rgba(255,255,255,0.04)",
                                border: "1px solid rgba(255,255,255,0.1)",
                                color: "#9CA3AF", cursor: "pointer",
                                transition: "all 0.15s",
                            }}
                            onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = "#fff"; (e.currentTarget as HTMLElement).style.borderColor = "rgba(255,255,255,0.2)"; }}
                            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = "#9CA3AF"; (e.currentTarget as HTMLElement).style.borderColor = "rgba(255,255,255,0.1)"; }}
                        >
                            Already have an account? Sign In
                        </button>
                        <button
                            onClick={() => setBlockedTool(null)}
                            style={{
                                background: "none", border: "none",
                                fontSize: "12px", color: "#374151",
                                cursor: "pointer", padding: "4px",
                                transition: "color 0.15s",
                            }}
                            onMouseEnter={e => (e.currentTarget as HTMLElement).style.color = "#6B7280"}
                            onMouseLeave={e => (e.currentTarget as HTMLElement).style.color = "#374151"}
                        >
                            Dismiss
                        </button>
                    </div>
                </div>
            </div>

            <style>{`
                @keyframes modalPop {
                    from { opacity: 0; transform: scale(0.94) translateY(12px); }
                    to   { opacity: 1; transform: scale(1)    translateY(0);    }
                }
            `}</style>
        </>
    );
}
