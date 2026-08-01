"use client";

import React from "react";
import Link from "next/link";
import { useDatabase } from "@/context/DatabaseContext";
import ConnectDBModal from "@/components/dashboard/ConnectDBModal";

/* ── Tool definitions ─────────────────────────────────────── */
const TOOLS = [
    {
        href: "/dashboard/query-studio",
        title: "Query Studio",
        description: "Write or generate SQL in plain English. Instant, secure execution.",
        accent: "#6366f1",
        bg: "rgba(99,102,241,0.12)",
        glow: "rgba(99,102,241,0.25)",
        illustration: (
            <svg width="80" height="64" viewBox="0 0 80 64" fill="none" xmlns="http://www.w3.org/2000/svg">
                <rect x="4" y="4" width="72" height="56" rx="8" fill="rgba(99,102,241,0.08)" stroke="rgba(99,102,241,0.3)" strokeWidth="1"/>
                <rect x="4" y="4" width="72" height="14" rx="8" fill="rgba(99,102,241,0.15)"/>
                <circle cx="14" cy="11" r="3" fill="#ef4444" opacity="0.7"/>
                <circle cx="24" cy="11" r="3" fill="#f59e0b" opacity="0.7"/>
                <circle cx="34" cy="11" r="3" fill="#10b981" opacity="0.7"/>
                <text x="12" y="31" fontFamily="monospace" fontSize="7" fill="#818cf8" opacity="0.9">SELECT</text>
                <text x="12" y="41" fontFamily="monospace" fontSize="7" fill="#94a3b8" opacity="0.7">  COUNT(*), SUM(revenue)</text>
                <text x="12" y="51" fontFamily="monospace" fontSize="7" fill="#818cf8" opacity="0.9">FROM</text>
                <text x="30" y="51" fontFamily="monospace" fontSize="7" fill="#a3e635" opacity="0.8"> sales</text>
                <rect x="60" y="46" width="12" height="8" rx="3" fill="rgba(99,102,241,0.5)"/>
                <path d="M63 50h6M63 52h4" stroke="white" strokeWidth="1.2" strokeLinecap="round"/>
            </svg>
        ),
    },
    {
        href: "/dashboard/data-visualizer",
        title: "Data Visualizer",
        description: "Turn your data into beautiful charts and dashboards.",
        accent: "#3b82f6",
        bg: "rgba(59,130,246,0.12)",
        glow: "rgba(59,130,246,0.25)",
        illustration: (
            <svg width="80" height="64" viewBox="0 0 80 64" fill="none" xmlns="http://www.w3.org/2000/svg">
                <rect x="4" y="4" width="72" height="56" rx="8" fill="rgba(59,130,246,0.06)" stroke="rgba(59,130,246,0.2)" strokeWidth="1"/>
                {/* Bar chart */}
                <rect x="14" y="38" width="10" height="16" rx="2" fill="rgba(59,130,246,0.7)"/>
                <rect x="28" y="28" width="10" height="26" rx="2" fill="rgba(99,102,241,0.7)"/>
                <rect x="42" y="20" width="10" height="34" rx="2" fill="rgba(59,130,246,0.5)"/>
                <rect x="56" y="32" width="10" height="22" rx="2" fill="rgba(139,92,246,0.7)"/>
                {/* Trend line */}
                <path d="M19 36 L33 26 L47 18 L61 30" stroke="#22d3ee" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" strokeDasharray="2 1" opacity="0.8"/>
                <circle cx="19" cy="36" r="2" fill="#22d3ee" opacity="0.9"/>
                <circle cx="33" cy="26" r="2" fill="#22d3ee" opacity="0.9"/>
                <circle cx="47" cy="18" r="2" fill="#22d3ee" opacity="0.9"/>
                <circle cx="61" cy="30" r="2" fill="#22d3ee" opacity="0.9"/>
                {/* X axis */}
                <line x1="10" y1="55" x2="70" y2="55" stroke="rgba(255,255,255,0.1)" strokeWidth="1"/>
            </svg>
        ),
    },
    {
        href: "/dashboard/schema-explorer",
        title: "Schema Explorer",
        description: "Explore tables, columns, relationships with an interactive tree.",
        accent: "#f59e0b",
        bg: "rgba(245,158,11,0.12)",
        glow: "rgba(245,158,11,0.25)",
        illustration: (
            <svg width="80" height="64" viewBox="0 0 80 64" fill="none" xmlns="http://www.w3.org/2000/svg">
                {/* Root node */}
                <rect x="28" y="6" width="24" height="12" rx="4" fill="rgba(245,158,11,0.3)" stroke="rgba(245,158,11,0.6)" strokeWidth="1"/>
                <text x="40" y="14" fontFamily="monospace" fontSize="6" fill="#fbbf24" textAnchor="middle">users</text>
                {/* Left branch */}
                <line x1="40" y1="18" x2="20" y2="30" stroke="rgba(245,158,11,0.4)" strokeWidth="1" strokeDasharray="2 1"/>
                <rect x="8" y="30" width="24" height="12" rx="4" fill="rgba(245,158,11,0.15)" stroke="rgba(245,158,11,0.4)" strokeWidth="1"/>
                <text x="20" y="38" fontFamily="monospace" fontSize="6" fill="#fbbf24" textAnchor="middle">orders</text>
                {/* Right branch */}
                <line x1="40" y1="18" x2="60" y2="30" stroke="rgba(245,158,11,0.4)" strokeWidth="1" strokeDasharray="2 1"/>
                <rect x="48" y="30" width="24" height="12" rx="4" fill="rgba(245,158,11,0.15)" stroke="rgba(245,158,11,0.4)" strokeWidth="1"/>
                <text x="60" y="38" fontFamily="monospace" fontSize="6" fill="#fbbf24" textAnchor="middle">products</text>
                {/* Leaf nodes */}
                <line x1="20" y1="42" x2="14" y2="52" stroke="rgba(245,158,11,0.3)" strokeWidth="1"/>
                <rect x="6" y="52" width="16" height="8" rx="3" fill="rgba(245,158,11,0.1)" stroke="rgba(245,158,11,0.3)" strokeWidth="1"/>
                <text x="14" y="58" fontFamily="monospace" fontSize="5" fill="#f59e0b" textAnchor="middle">id</text>
                <line x1="20" y1="42" x2="26" y2="52" stroke="rgba(245,158,11,0.3)" strokeWidth="1"/>
                <rect x="18" y="52" width="16" height="8" rx="3" fill="rgba(245,158,11,0.1)" stroke="rgba(245,158,11,0.3)" strokeWidth="1"/>
                <text x="26" y="58" fontFamily="monospace" fontSize="5" fill="#f59e0b" textAnchor="middle">name</text>
                <line x1="60" y1="42" x2="60" y2="52" stroke="rgba(245,158,11,0.3)" strokeWidth="1"/>
                <rect x="52" y="52" width="16" height="8" rx="3" fill="rgba(245,158,11,0.1)" stroke="rgba(245,158,11,0.3)" strokeWidth="1"/>
                <text x="60" y="58" fontFamily="monospace" fontSize="5" fill="#f59e0b" textAnchor="middle">price</text>
            </svg>
        ),
    },
    {
        href: "/dashboard/report-builder",
        title: "Report Builder",
        description: "Create insightful reports and executive summaries in one click.",
        accent: "#10b981",
        bg: "rgba(16,185,129,0.12)",
        glow: "rgba(16,185,129,0.25)",
        illustration: (
            <svg width="80" height="64" viewBox="0 0 80 64" fill="none" xmlns="http://www.w3.org/2000/svg">
                {/* Document */}
                <rect x="18" y="4" width="44" height="56" rx="6" fill="rgba(16,185,129,0.06)" stroke="rgba(16,185,129,0.25)" strokeWidth="1"/>
                <path d="M18 10 Q18 4 24 4 L52 4 L62 14 V58 Q62 60 60 60 H20 Q18 60 18 58Z" fill="rgba(16,185,129,0.08)"/>
                <path d="M52 4 L52 14 L62 14" stroke="rgba(16,185,129,0.35)" strokeWidth="1" fill="none"/>
                {/* Lines representing text */}
                <rect x="24" y="20" width="32" height="3" rx="1.5" fill="rgba(16,185,129,0.4)"/>
                <rect x="24" y="27" width="28" height="2" rx="1" fill="rgba(255,255,255,0.12)"/>
                <rect x="24" y="32" width="32" height="2" rx="1" fill="rgba(255,255,255,0.12)"/>
                {/* Mini bar chart inside doc */}
                <rect x="24" y="38" width="5" height="12" rx="1.5" fill="rgba(16,185,129,0.5)"/>
                <rect x="32" y="42" width="5" height="8" rx="1.5" fill="rgba(16,185,129,0.35)"/>
                <rect x="40" y="40" width="5" height="10" rx="1.5" fill="rgba(16,185,129,0.5)"/>
                <rect x="48" y="36" width="5" height="14" rx="1.5" fill="rgba(16,185,129,0.65)"/>
                {/* Check badge */}
                <circle cx="56" cy="52" r="7" fill="rgba(16,185,129,0.3)" stroke="rgba(16,185,129,0.6)" strokeWidth="1"/>
                <path d="M53 52 L55.5 54.5 L59 50" stroke="#10b981" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
        ),
    },
    {
        href: "/dashboard/data-profiler",
        title: "Data Profiler",
        description: "Analyze data quality, detect anomalies and column insights.",
        accent: "#8b5cf6",
        bg: "rgba(139,92,246,0.12)",
        glow: "rgba(139,92,246,0.25)",
        illustration: (
            <svg width="80" height="64" viewBox="0 0 80 64" fill="none" xmlns="http://www.w3.org/2000/svg">
                {/* Gauge arc */}
                <path d="M14 44 A26 26 0 0 1 66 44" stroke="rgba(139,92,246,0.2)" strokeWidth="5" strokeLinecap="round" fill="none"/>
                <path d="M14 44 A26 26 0 0 1 52 20" stroke="url(#gaugeGrad)" strokeWidth="5" strokeLinecap="round" fill="none"/>
                <defs>
                    <linearGradient id="gaugeGrad" x1="14" y1="44" x2="52" y2="20" gradientUnits="userSpaceOnUse">
                        <stop offset="0%" stopColor="#10b981"/>
                        <stop offset="60%" stopColor="#f59e0b"/>
                        <stop offset="100%" stopColor="#ef4444"/>
                    </linearGradient>
                </defs>
                {/* Needle */}
                <line x1="40" y1="44" x2="48" y2="22" stroke="#8b5cf6" strokeWidth="2" strokeLinecap="round"/>
                <circle cx="40" cy="44" r="4" fill="#8b5cf6"/>
                <circle cx="40" cy="44" r="2" fill="white" opacity="0.8"/>
                {/* Score label */}
                <text x="40" y="58" fontFamily="sans-serif" fontSize="9" fontWeight="bold" fill="#a78bfa" textAnchor="middle">92%</text>
                {/* Side dots for anomalies */}
                <circle cx="8" cy="32" r="3" fill="#ef4444" opacity="0.7"/>
                <circle cx="72" cy="32" r="3" fill="#10b981" opacity="0.7"/>
                <circle cx="8" cy="42" r="2" fill="#f59e0b" opacity="0.5"/>
                <circle cx="72" cy="42" r="2" fill="#10b981" opacity="0.5"/>
            </svg>
        ),
    },
];

const BADGES = [
    {
        label: "Secure & Private",
        sub: "Your data stays private and secure.",
        color: "#10b981",
        icon: (
            <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
            </svg>
        ),
    },
    {
        label: "PostgreSQL Ready",
        sub: "Optimized for PostgreSQL databases.",
        color: "#3b82f6",
        icon: (
            <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M20.25 6.375c0 2.278-3.694 4.125-8.25 4.125S3.75 8.653 3.75 6.375m16.5 0c0-2.278-3.694-4.125-8.25-4.125S3.75 4.097 3.75 6.375m16.5 0v11.25c0 2.278-3.694 4.125-8.25 4.125s-8.25-1.847-8.25-4.125V6.375m16.5 2.625c0 2.278-3.694 4.125-8.25 4.125s-8.25-1.847-8.25-4.125" />
            </svg>
        ),
    },
    {
        label: "AI-Powered",
        sub: "Advanced AI for accurate SQL generation.",
        color: "#a855f7",
        icon: (
            <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" />
            </svg>
        ),
    },
    {
        label: "Real-time Results",
        sub: "Get results and insights in real-time.",
        color: "#f59e0b",
        icon: (
            <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75z" />
            </svg>
        ),
    },
];

/* ── ToolCard ─────────────────────────────────────────────── */
function ToolCard({ href, title, description, accent, bg, glow, illustration }: (typeof TOOLS)[number]) {
    const [hovered, setHovered] = React.useState(false);
    return (
        <Link href={href} style={{ textDecoration: "none", display: "block", height: "100%" }}>
            <div
                onMouseEnter={() => setHovered(true)}
                onMouseLeave={() => setHovered(false)}
                style={{
                    position: "relative",
                    display: "flex",
                    flexDirection: "column",
                    height: "200px",
                    padding: "20px",
                    borderRadius: "16px",
                    border: hovered ? `1px solid ${accent}55` : "1px solid rgba(255,255,255,0.07)",
                    background: hovered
                        ? `linear-gradient(145deg, ${bg}, rgba(13,15,26,0.95))`
                        : "#0d0f1a",
                    cursor: "pointer",
                    transition: "all 0.25s ease",
                    transform: hovered ? "translateY(-3px)" : "none",
                    boxShadow: hovered ? `0 12px 32px ${glow}` : "0 2px 8px rgba(0,0,0,0.3)",
                    overflow: "hidden",
                }}
            >
                {/* Glowing top border on hover */}
                <div style={{
                    position: "absolute",
                    top: 0, left: "20%", right: "20%", height: "1px",
                    background: `linear-gradient(90deg, transparent, ${accent}, transparent)`,
                    opacity: hovered ? 1 : 0,
                    transition: "opacity 0.25s ease",
                }} />

                {/* Background illustration — decorative, top-right */}
                <div style={{
                    position: "absolute",
                    top: "8px",
                    right: "8px",
                    opacity: hovered ? 0.9 : 0.55,
                    transition: "opacity 0.25s ease, transform 0.25s ease",
                    transform: hovered ? "scale(1.06) translateY(-2px)" : "scale(1)",
                    pointerEvents: "none",
                }}>
                    {illustration}
                </div>

                {/* Subtle radial glow blob */}
                <div style={{
                    position: "absolute",
                    bottom: "-20px",
                    right: "-10px",
                    width: "100px",
                    height: "100px",
                    borderRadius: "50%",
                    background: accent,
                    opacity: hovered ? 0.07 : 0.03,
                    filter: "blur(28px)",
                    transition: "opacity 0.25s ease",
                    pointerEvents: "none",
                }} />

                {/* Content — pinned to bottom */}
                <div style={{ marginTop: "auto", position: "relative", zIndex: 1 }}>
                    {/* Accent pill */}
                    <div style={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: "5px",
                        padding: "3px 9px",
                        borderRadius: "20px",
                        background: bg,
                        marginBottom: "8px",
                    }}>
                        <div style={{ width: "5px", height: "5px", borderRadius: "50%", background: accent }} />
                        <span style={{ fontSize: "9px", fontWeight: 700, color: accent, textTransform: "uppercase", letterSpacing: "0.08em" }}>
                            {title}
                        </span>
                    </div>
                    <p style={{ fontSize: "11px", color: "#6B7280", lineHeight: 1.55, margin: 0 }}>{description}</p>
                </div>

                {/* Arrow */}
                <div style={{
                    position: "absolute",
                    bottom: "16px",
                    right: "16px",
                    zIndex: 1,
                    opacity: hovered ? 1 : 0.3,
                    transition: "all 0.2s ease",
                    transform: hovered ? "translate(1px, -1px)" : "none",
                }}>
                    <svg width="14" height="14" fill="none" stroke={accent} strokeWidth="2" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
                    </svg>
                </div>
            </div>
        </Link>
    );
}

/* ── Page ─────────────────────────────────────────────────── */
export default function DashboardHome() {
    const { showConnectModal, setShowConnectModal } = useDatabase();

    return (
        <div style={{ display: "flex", flexDirection: "column", gap: "28px", paddingBottom: "32px" }}>

            {/* ── Hero ───────────────────────────────────────────── */}
            <div style={{ display: "flex", gap: "32px", alignItems: "flex-start", flexWrap: "wrap" }}>

                {/* Left */}
                <div style={{ flex: "1 1 320px", paddingTop: "8px" }}>
                    <p style={{
                        fontSize: "11px", fontWeight: 700, letterSpacing: "0.12em",
                        textTransform: "uppercase", color: "#6366f1", marginBottom: "16px",
                    }}>AI-POWERED SQL ASSISTANT</p>
                    <h1 style={{
                        fontSize: "clamp(28px, 4vw, 44px)", fontWeight: 900, color: "#fff",
                        lineHeight: 1.15, letterSpacing: "-0.03em", margin: "0 0 16px",
                    }}>
                        Chat with your<br />
                        Database.{" "}
                        <span style={{
                            background: "linear-gradient(135deg,#6366f1,#8b5cf6)",
                            WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent",
                        }}>Naturally.</span>
                    </h1>
                    <p style={{ fontSize: "14px", color: "#9CA3AF", lineHeight: 1.65, marginBottom: "28px", maxWidth: "420px" }}>
                        Ask questions, generate SQL, visualize results, and build reports — all in one place.
                    </p>
                    <div style={{ display: "flex", gap: "12px", flexWrap: "wrap" }}>
                        <Link href="/dashboard/query-studio" style={{
                            display: "inline-flex", alignItems: "center", gap: "8px",
                            padding: "10px 22px", borderRadius: "10px",
                            background: "linear-gradient(135deg,#6366f1,#8b5cf6)",
                            color: "#fff", fontSize: "13px", fontWeight: 700,
                            textDecoration: "none", boxShadow: "0 4px 18px rgba(99,102,241,0.3)",
                            transition: "filter 0.15s",
                        }}
                            onMouseEnter={e => (e.currentTarget as HTMLElement).style.filter = "brightness(1.1)"}
                            onMouseLeave={e => (e.currentTarget as HTMLElement).style.filter = "none"}
                        >
                            Start Asking
                            <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
                            </svg>
                        </Link>
                        <button onClick={() => setShowConnectModal(true)} style={{
                            display: "inline-flex", alignItems: "center", gap: "8px",
                            padding: "10px 22px", borderRadius: "10px", cursor: "pointer",
                            background: "rgba(255,255,255,0.04)", color: "#9CA3AF",
                            fontSize: "13px", fontWeight: 600,
                            border: "1px solid rgba(255,255,255,0.1)", transition: "all 0.15s",
                        }}
                            onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = "#fff"; (e.currentTarget as HTMLElement).style.borderColor = "rgba(255,255,255,0.2)"; }}
                            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = "#9CA3AF"; (e.currentTarget as HTMLElement).style.borderColor = "rgba(255,255,255,0.1)"; }}
                        >
                            Explore Features
                        </button>
                    </div>
                </div>

                {/* Right: SQL demo card */}
                <div style={{ flex: "1 1 360px", maxWidth: "460px" }}>
                    <div style={{
                        borderRadius: "16px", border: "1px solid rgba(255,255,255,0.08)",
                        background: "#0a0c18", overflow: "hidden",
                        boxShadow: "0 20px 60px rgba(0,0,0,0.5)",
                    }}>
                        {/* Chat bubble */}
                        <div style={{ padding: "16px 16px 14px", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
                            <div style={{ display: "flex", alignItems: "flex-start", gap: "10px" }}>
                                <div style={{
                                    width: "28px", height: "28px", borderRadius: "50%",
                                    background: "linear-gradient(135deg,#6366f1,#8b5cf6)",
                                    display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
                                }}>
                                    <svg width="13" height="13" fill="none" stroke="white" strokeWidth="2" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0" />
                                    </svg>
                                </div>
                                <div style={{
                                    background: "rgba(255,255,255,0.05)", borderRadius: "12px", borderTopLeftRadius: "4px",
                                    padding: "10px 14px", fontSize: "12px", color: "#D1D5DB", lineHeight: 1.55, maxWidth: "280px",
                                }}>
                                    How many sales were made last month and what's the total revenue?
                                </div>
                            </div>
                        </div>

                        {/* SQL */}
                        <div style={{ padding: "14px 16px", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
                            <div style={{ display: "flex", alignItems: "center", gap: "6px", marginBottom: "10px" }}>
                                <span style={{ width: "6px", height: "6px", borderRadius: "50%", background: "#6366f1", display: "inline-block" }} />
                                <span style={{ fontSize: "10px", fontWeight: 700, color: "#6366f1", textTransform: "uppercase", letterSpacing: "0.1em" }}>SQL</span>
                            </div>
                            <pre style={{
                                margin: 0, padding: "12px 14px", borderRadius: "10px",
                                background: "rgba(0,0,0,0.4)", fontSize: "11px", fontFamily: "monospace",
                                lineHeight: 1.7, color: "#94a3b8", overflow: "auto",
                            }}>
                                <span style={{ color: "#818cf8" }}>SELECT</span>{"\n"}
                                {"  "}<span style={{ color: "#22d3ee" }}>COUNT(*)</span>{" "}as total_sales,{"\n"}
                                {"  "}<span style={{ color: "#22d3ee" }}>SUM(revenue)</span>{" "}as total_revenue{"\n"}
                                <span style={{ color: "#818cf8" }}>FROM</span>{" "}sales{"\n"}
                                <span style={{ color: "#818cf8" }}>WHERE</span>{" "}created_at {">="}  {"\n"}
                                {"  "}DATE_TRUNC(<span style={{ color: "#a3e635" }}>'month'</span>,{"\n"}
                                {"  "}CURRENT_DATE - INTERVAL <span style={{ color: "#a3e635" }}>'1 month'</span>);
                            </pre>
                        </div>

                        {/* Results */}
                        <div style={{ padding: "14px 16px" }}>
                            <div style={{ display: "flex", alignItems: "center", gap: "6px", marginBottom: "10px" }}>
                                <span style={{ width: "6px", height: "6px", borderRadius: "50%", background: "#10b981", display: "inline-block" }} />
                                <span style={{ fontSize: "10px", fontWeight: 700, color: "#10b981", textTransform: "uppercase", letterSpacing: "0.1em" }}>Results</span>
                            </div>
                            <div style={{ borderRadius: "8px", overflow: "hidden", border: "1px solid rgba(255,255,255,0.07)" }}>
                                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "11px" }}>
                                    <thead>
                                        <tr style={{ background: "rgba(255,255,255,0.04)" }}>
                                            <th style={{ padding: "8px 14px", textAlign: "left", color: "#6366f1", fontWeight: 600 }}>total_sales</th>
                                            <th style={{ padding: "8px 14px", textAlign: "left", color: "#6366f1", fontWeight: 600 }}>total_revenue</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        <tr>
                                            <td style={{ padding: "8px 14px", color: "#D1D5DB", fontFamily: "monospace" }}>1,250</td>
                                            <td style={{ padding: "8px 14px", color: "#D1D5DB", fontFamily: "monospace" }}>$88,420.50</td>
                                        </tr>
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* ── Tool Cards ─────────────────────────────────────── */}
            <div style={{
                display: "grid",
                gridTemplateColumns: "repeat(5, 1fr)",
                gap: "14px",
            }}>
                {TOOLS.map(t => <ToolCard key={t.href} {...t} />)}
            </div>

            {/* ── Ready to connect + badges ──────────────────────── */}
            <div style={{
                display: "flex",
                gap: "24px",
                flexWrap: "wrap",
                alignItems: "flex-start",
                padding: "24px 28px",
                borderRadius: "16px",
                border: "1px solid rgba(255,255,255,0.07)",
                background: "#0d0f1a",
            }}>
                {/* CTA */}
                <div style={{ flexShrink: 0, minWidth: "200px" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "4px" }}>
                        <svg width="16" height="16" fill="none" stroke="#6366f1" strokeWidth="2" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M20.25 6.375c0 2.278-3.694 4.125-8.25 4.125S3.75 8.653 3.75 6.375m16.5 0c0-2.278-3.694-4.125-8.25-4.125S3.75 4.097 3.75 6.375m16.5 0v11.25c0 2.278-3.694 4.125-8.25 4.125s-8.25-1.847-8.25-4.125V6.375m16.5 2.625c0 2.278-3.694 4.125-8.25 4.125s-8.25-1.847-8.25-4.125" />
                        </svg>
                        <h3 style={{ fontSize: "15px", fontWeight: 700, color: "#fff", margin: 0 }}>Ready to connect?</h3>
                    </div>
                    <p style={{ fontSize: "12px", color: "#6B7280", lineHeight: 1.55, marginBottom: "16px" }}>
                        Connect your PostgreSQL database securely and start asking questions.
                    </p>
                    <button onClick={() => setShowConnectModal(true)} style={{
                        display: "inline-flex", alignItems: "center", gap: "8px",
                        padding: "9px 18px", borderRadius: "9px", cursor: "pointer",
                        background: "linear-gradient(135deg,#6366f1,#8b5cf6)", color: "#fff",
                        fontSize: "12px", fontWeight: 700, border: "none",
                        boxShadow: "0 4px 14px rgba(99,102,241,0.25)", transition: "filter 0.15s",
                    }}
                        onMouseEnter={e => (e.currentTarget as HTMLElement).style.filter = "brightness(1.1)"}
                        onMouseLeave={e => (e.currentTarget as HTMLElement).style.filter = "none"}
                    >
                        <svg width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M13.19 8.688a4.5 4.5 0 011.242 7.244l-4.5 4.5a4.5 4.5 0 01-6.364-6.364l1.757-1.757m13.35-.622l1.757-1.757a4.5 4.5 0 00-6.364-6.364l-4.5 4.5a4.5 4.5 0 001.242 7.244" />
                        </svg>
                        Connect Database
                    </button>
                </div>

                {/* Divider */}
                <div style={{ width: "1px", background: "rgba(255,255,255,0.06)", alignSelf: "stretch" }} />

                {/* Badges */}
                <div style={{
                    flex: 1,
                    display: "grid",
                    gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))",
                    gap: "20px",
                }}>
                    {BADGES.map(b => (
                        <div key={b.label} style={{ display: "flex", alignItems: "flex-start", gap: "10px" }}>
                            <div style={{
                                width: "30px", height: "30px", borderRadius: "8px",
                                background: `${b.color}18`, color: b.color,
                                display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
                            }}>
                                {b.icon}
                            </div>
                            <div>
                                <p style={{ fontSize: "12px", fontWeight: 600, color: "#fff", margin: "0 0 2px" }}>{b.label}</p>
                                <p style={{ fontSize: "11px", color: "#6B7280", margin: 0, lineHeight: 1.45 }}>{b.sub}</p>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Footer */}
            <p style={{ textAlign: "center", fontSize: "11px", color: "#1F2937", marginTop: "4px" }}>
                Made with ♥ for data teams and curious minds. · © 2025 Talk2DB. All rights reserved.
            </p>

            <ConnectDBModal isOpen={showConnectModal} onClose={() => setShowConnectModal(false)} />
        </div>
    );
}
