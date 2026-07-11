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
        bg: "rgba(99,102,241,0.1)",
        icon: (
            <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M17.25 6.75L22.5 12l-5.25 5.25m-10.5 0L1.5 12l5.25-5.25m7.5-3l-4.5 16.5" />
            </svg>
        ),
    },
    {
        href: "/dashboard/data-visualizer",
        title: "Data Visualizer",
        description: "Turn your data into beautiful charts and dashboards.",
        accent: "#3b82f6",
        bg: "rgba(59,130,246,0.1)",
        icon: (
            <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M7.5 14.25v2.25m3-4.5v4.5m3-6.75v6.75m3-9v9M6 20.25h12A2.25 2.25 0 0020.25 18V6A2.25 2.25 0 0018 3.75H6A2.25 2.25 0 003.75 6v12A2.25 2.25 0 006 20.25z" />
            </svg>
        ),
    },
    {
        href: "/dashboard/schema-explorer",
        title: "Schema Explorer",
        description: "Explore tables, columns, relationships with an interactive tree.",
        accent: "#f59e0b",
        bg: "rgba(245,158,11,0.1)",
        icon: (
            <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6A2.25 2.25 0 016 3.75h2.25A2.25 2.25 0 0110.5 6v2.25a2.25 2.25 0 01-2.25 2.25H6a2.25 2.25 0 01-2.25-2.25V6zM3.75 15.75A2.25 2.25 0 016 13.5h2.25a2.25 2.25 0 012.25 2.25V18a2.25 2.25 0 01-2.25 2.25H6A2.25 2.25 0 013.75 18v-2.25zM13.5 6a2.25 2.25 0 012.25-2.25H18A2.25 2.25 0 0120.25 6v2.25A2.25 2.25 0 0118 10.5h-2.25a2.25 2.25 0 01-2.25-2.25V6zM13.5 15.75a2.25 2.25 0 012.25-2.25H18a2.25 2.25 0 012.25 2.25V18A2.25 2.25 0 0118 20.25h-2.25A2.25 2.25 0 0113.5 18v-2.25z" />
            </svg>
        ),
    },
    {
        href: "/dashboard/report-builder",
        title: "Report Builder",
        description: "Create insightful reports and executive summaries in one click.",
        accent: "#10b981",
        bg: "rgba(16,185,129,0.1)",
        icon: (
            <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
            </svg>
        ),
    },
    {
        href: "/dashboard/data-profiler",
        title: "Data Profiler",
        description: "Analyze data quality, detect anomalies and column insights.",
        accent: "#8b5cf6",
        bg: "rgba(139,92,246,0.1)",
        icon: (
            <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h3.75M9 15h3.75m-7.5 6H18a2.25 2.25 0 002.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 00-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 00.75-.75 2.25 2.25 0 00-.1-.664m-5.8 0A2.251 2.251 0 0113.5 2.25H15c1.012 0 1.867.668 2.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25z" />
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
function ToolCard({ href, title, description, accent, bg, icon }: (typeof TOOLS)[number]) {
    const [hovered, setHovered] = React.useState(false);
    return (
        <Link href={href} style={{ textDecoration: "none" }}>
            <div
                onMouseEnter={() => setHovered(true)}
                onMouseLeave={() => setHovered(false)}
                style={{
                    display: "flex",
                    flexDirection: "column",
                    gap: "12px",
                    padding: "20px",
                    borderRadius: "14px",
                    border: hovered ? `1px solid ${accent}40` : "1px solid rgba(255,255,255,0.07)",
                    background: hovered ? `rgba(255,255,255,0.03)` : "#0d0f1a",
                    cursor: "pointer",
                    transition: "all 0.2s ease",
                    transform: hovered ? "translateY(-2px)" : "none",
                    boxShadow: hovered ? `0 8px 24px ${accent}18` : "none",
                }}
            >
                <div style={{
                    width: "36px", height: "36px", borderRadius: "10px",
                    background: bg, color: accent,
                    display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
                }}>
                    {icon}
                </div>
                <div style={{ flex: 1 }}>
                    <h3 style={{ fontSize: "13px", fontWeight: 700, color: "#fff", margin: "0 0 4px" }}>{title}</h3>
                    <p style={{ fontSize: "11px", color: "#6B7280", lineHeight: 1.55, margin: 0 }}>{description}</p>
                </div>
                <div style={{ display: "flex", justifyContent: "flex-end" }}>
                    <svg width="14" height="14" fill="none" stroke={hovered ? "#fff" : "#374151"} strokeWidth="2" viewBox="0 0 24 24"
                        style={{ transition: "stroke 0.2s, transform 0.2s", transform: hovered ? "translateX(2px)" : "none" }}>
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
                gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))",
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
