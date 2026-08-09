"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useDatabase } from "@/context/DatabaseContext";
import ConnectDBModal from "@/components/dashboard/ConnectDBModal";

/* ─────────────────────────── types ─────────────────────────── */
interface Conversation {
    id: string;
    title: string;
    updatedAt: string;
    createdAt: string;
}

interface SavedReport {
    id: string;
    title: string;
    prompt: string;
    chartType: string | null;
    createdAt: string;
}

interface DashboardItem {
    id: string;
    title: string;
    sql: string;
    type: string;
    config: any;
    createdAt: string;
}

/* ─────────────────────────── helpers ───────────────────────── */
function timeAgo(iso: string) {
    const diff = Date.now() - new Date(iso).getTime();
    const m = Math.floor(diff / 60000);
    if (m < 1) return "just now";
    if (m < 60) return `${m}m ago`;
    const h = Math.floor(m / 60);
    if (h < 24) return `${h}h ago`;
    const d = Math.floor(h / 24);
    if (d < 30) return `${d}d ago`;
    return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

/* ─────────────────────────── TOOLS ─────────────────────────── */
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
                <rect x="14" y="38" width="10" height="16" rx="2" fill="rgba(59,130,246,0.7)"/>
                <rect x="28" y="28" width="10" height="26" rx="2" fill="rgba(99,102,241,0.7)"/>
                <rect x="42" y="20" width="10" height="34" rx="2" fill="rgba(59,130,246,0.5)"/>
                <rect x="56" y="32" width="10" height="22" rx="2" fill="rgba(139,92,246,0.7)"/>
                <path d="M19 36 L33 26 L47 18 L61 30" stroke="#22d3ee" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" strokeDasharray="2 1" opacity="0.8"/>
                <circle cx="19" cy="36" r="2" fill="#22d3ee" opacity="0.9"/>
                <circle cx="33" cy="26" r="2" fill="#22d3ee" opacity="0.9"/>
                <circle cx="47" cy="18" r="2" fill="#22d3ee" opacity="0.9"/>
                <circle cx="61" cy="30" r="2" fill="#22d3ee" opacity="0.9"/>
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
                <rect x="28" y="6" width="24" height="12" rx="4" fill="rgba(245,158,11,0.3)" stroke="rgba(245,158,11,0.6)" strokeWidth="1"/>
                <text x="40" y="14" fontFamily="monospace" fontSize="6" fill="#fbbf24" textAnchor="middle">users</text>
                <line x1="40" y1="18" x2="20" y2="30" stroke="rgba(245,158,11,0.4)" strokeWidth="1" strokeDasharray="2 1"/>
                <rect x="8" y="30" width="24" height="12" rx="4" fill="rgba(245,158,11,0.15)" stroke="rgba(245,158,11,0.4)" strokeWidth="1"/>
                <text x="20" y="38" fontFamily="monospace" fontSize="6" fill="#fbbf24" textAnchor="middle">orders</text>
                <line x1="40" y1="18" x2="60" y2="30" stroke="rgba(245,158,11,0.4)" strokeWidth="1" strokeDasharray="2 1"/>
                <rect x="48" y="30" width="24" height="12" rx="4" fill="rgba(245,158,11,0.15)" stroke="rgba(245,158,11,0.4)" strokeWidth="1"/>
                <text x="60" y="38" fontFamily="monospace" fontSize="6" fill="#fbbf24" textAnchor="middle">products</text>
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
                <rect x="18" y="4" width="44" height="56" rx="6" fill="rgba(16,185,129,0.06)" stroke="rgba(16,185,129,0.25)" strokeWidth="1"/>
                <path d="M52 4 L52 14 L62 14" stroke="rgba(16,185,129,0.35)" strokeWidth="1" fill="none"/>
                <rect x="24" y="20" width="32" height="3" rx="1.5" fill="rgba(16,185,129,0.4)"/>
                <rect x="24" y="27" width="28" height="2" rx="1" fill="rgba(255,255,255,0.12)"/>
                <rect x="24" y="32" width="32" height="2" rx="1" fill="rgba(255,255,255,0.12)"/>
                <rect x="24" y="38" width="5" height="12" rx="1.5" fill="rgba(16,185,129,0.5)"/>
                <rect x="32" y="42" width="5" height="8" rx="1.5" fill="rgba(16,185,129,0.35)"/>
                <rect x="40" y="40" width="5" height="10" rx="1.5" fill="rgba(16,185,129,0.5)"/>
                <rect x="48" y="36" width="5" height="14" rx="1.5" fill="rgba(16,185,129,0.65)"/>
                <circle cx="56" cy="52" r="7" fill="rgba(16,185,129,0.3)" stroke="rgba(16,185,129,0.6)" strokeWidth="1"/>
                <path d="M53 52 L55.5 54.5 L59 50" stroke="#10b981" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
        ),
    },
    {
        href: "/dashboard/data-autoflow",
        title: "Data AutoFlow",
        description: "Extract, profile, and compare CSV, Excel, and PDF datasets with AI-powered insights.",
        accent: "#06b6d4",
        bg: "rgba(6,182,212,0.12)",
        glow: "rgba(6,182,212,0.25)",
        illustration: (
            <svg width="80" height="64" viewBox="0 0 80 64" fill="none" xmlns="http://www.w3.org/2000/svg">
                <rect x="4" y="4" width="72" height="56" rx="8" fill="rgba(6,182,212,0.06)" stroke="rgba(6,182,212,0.2)" strokeWidth="1"/>
                {/* CSV file */}
                <rect x="8" y="10" width="20" height="24" rx="3" fill="rgba(6,182,212,0.15)" stroke="rgba(6,182,212,0.4)" strokeWidth="1"/>
                <line x1="11" y1="17" x2="25" y2="17" stroke="rgba(6,182,212,0.6)" strokeWidth="1"/>
                <line x1="11" y1="21" x2="22" y2="21" stroke="rgba(6,182,212,0.4)" strokeWidth="1"/>
                <line x1="11" y1="25" x2="24" y2="25" stroke="rgba(6,182,212,0.4)" strokeWidth="1"/>
                <text x="18" y="31" fontFamily="monospace" fontSize="5" fill="#06b6d4" textAnchor="middle">CSV</text>
                {/* Arrow */}
                <path d="M30 22 L38 22" stroke="#06b6d4" strokeWidth="1.5" strokeLinecap="round"/>
                <path d="M35 19 L38 22 L35 25" stroke="#06b6d4" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                {/* Process box */}
                <rect x="38" y="14" width="16" height="16" rx="4" fill="rgba(6,182,212,0.2)" stroke="rgba(6,182,212,0.5)" strokeWidth="1"/>
                <text x="46" y="20" fontFamily="monospace" fontSize="5" fill="#06b6d4" textAnchor="middle">AI</text>
                <text x="46" y="26" fontFamily="monospace" fontSize="4" fill="#06b6d4" textAnchor="middle">Flow</text>
                {/* Arrow out */}
                <path d="M54 22 L62 22" stroke="#06b6d4" strokeWidth="1.5" strokeLinecap="round"/>
                <path d="M59 19 L62 22 L59 25" stroke="#06b6d4" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                {/* Results */}
                <rect x="62" y="14" width="12" height="7" rx="2" fill="rgba(52,211,153,0.2)" stroke="rgba(52,211,153,0.4)" strokeWidth="0.8"/>
                <rect x="62" y="23" width="12" height="7" rx="2" fill="rgba(245,158,11,0.2)" stroke="rgba(245,158,11,0.4)" strokeWidth="0.8"/>
                {/* Bottom compare visual */}
                <rect x="8" y="40" width="28" height="16" rx="3" fill="rgba(6,182,212,0.08)" stroke="rgba(6,182,212,0.2)" strokeWidth="1"/>
                <rect x="44" y="40" width="28" height="16" rx="3" fill="rgba(167,139,250,0.08)" stroke="rgba(167,139,250,0.2)" strokeWidth="1"/>
                <text x="22" y="51" fontFamily="sans-serif" fontSize="6" fill="#06b6d4" textAnchor="middle">Dataset A</text>
                <text x="58" y="51" fontFamily="sans-serif" fontSize="6" fill="#a78bfa" textAnchor="middle">Dataset B</text>
                <path d="M36 48 L44 48" stroke="#f59e0b" strokeWidth="1.5" strokeDasharray="2 1" strokeLinecap="round"/>
                <text x="40" y="46" fontFamily="sans-serif" fontSize="4" fill="#f59e0b" textAnchor="middle">~</text>
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
                <path d="M14 44 A26 26 0 0 1 66 44" stroke="rgba(139,92,246,0.2)" strokeWidth="5" strokeLinecap="round" fill="none"/>
                <path d="M14 44 A26 26 0 0 1 52 20" stroke="url(#gaugeGrad)" strokeWidth="5" strokeLinecap="round" fill="none"/>
                <defs>
                    <linearGradient id="gaugeGrad" x1="14" y1="44" x2="52" y2="20" gradientUnits="userSpaceOnUse">
                        <stop offset="0%" stopColor="#10b981"/>
                        <stop offset="60%" stopColor="#f59e0b"/>
                        <stop offset="100%" stopColor="#ef4444"/>
                    </linearGradient>
                </defs>
                <line x1="40" y1="44" x2="48" y2="22" stroke="#8b5cf6" strokeWidth="2" strokeLinecap="round"/>
                <circle cx="40" cy="44" r="4" fill="#8b5cf6"/>
                <circle cx="40" cy="44" r="2" fill="white" opacity="0.8"/>
                <text x="40" y="58" fontFamily="sans-serif" fontSize="9" fontWeight="bold" fill="#a78bfa" textAnchor="middle">92%</text>
                <circle cx="8" cy="32" r="3" fill="#ef4444" opacity="0.7"/>
                <circle cx="72" cy="32" r="3" fill="#10b981" opacity="0.7"/>
            </svg>
        ),
    },
];

/* ─────────────────────────── BADGES ────────────────────────── */
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

/* ─────────────────────────── ToolCard ──────────────────────── */
function ToolCard({ href, title, description, accent, bg, glow, illustration }: (typeof TOOLS)[number]) {
    const [hovered, setHovered] = React.useState(false);
    return (
        <Link href={href} style={{ textDecoration: "none", display: "block", height: "100%" }}>
            <div
                onMouseEnter={() => setHovered(true)}
                onMouseLeave={() => setHovered(false)}
                style={{
                    position: "relative", display: "flex", flexDirection: "column",
                    height: "200px", padding: "20px", borderRadius: "16px",
                    border: hovered ? `1px solid ${accent}55` : "1px solid rgba(255,255,255,0.07)",
                    background: hovered ? `linear-gradient(145deg, ${bg}, rgba(13,15,26,0.95))` : "#0d0f1a",
                    cursor: "pointer", transition: "all 0.25s ease",
                    transform: hovered ? "translateY(-3px)" : "none",
                    boxShadow: hovered ? `0 12px 32px ${glow}` : "0 2px 8px rgba(0,0,0,0.3)",
                    overflow: "hidden",
                }}
            >
                <div style={{ position: "absolute", top: 0, left: "20%", right: "20%", height: "1px", background: `linear-gradient(90deg, transparent, ${accent}, transparent)`, opacity: hovered ? 1 : 0, transition: "opacity 0.25s ease" }} />
                <div style={{ position: "absolute", top: "8px", right: "8px", opacity: hovered ? 0.9 : 0.55, transition: "opacity 0.25s ease, transform 0.25s ease", transform: hovered ? "scale(1.06) translateY(-2px)" : "scale(1)", pointerEvents: "none" }}>
                    {illustration}
                </div>
                <div style={{ position: "absolute", bottom: "-20px", right: "-10px", width: "100px", height: "100px", borderRadius: "50%", background: accent, opacity: hovered ? 0.07 : 0.03, filter: "blur(28px)", transition: "opacity 0.25s ease", pointerEvents: "none" }} />
                <div style={{ marginTop: "auto", position: "relative", zIndex: 1 }}>
                    <div style={{ display: "inline-flex", alignItems: "center", gap: "5px", padding: "3px 9px", borderRadius: "20px", background: bg, marginBottom: "8px" }}>
                        <div style={{ width: "5px", height: "5px", borderRadius: "50%", background: accent }} />
                        <span style={{ fontSize: "9px", fontWeight: 700, color: accent, textTransform: "uppercase", letterSpacing: "0.08em" }}>{title}</span>
                    </div>
                    <p style={{ fontSize: "11px", color: "#6B7280", lineHeight: 1.55, margin: 0 }}>{description}</p>
                </div>
                <div style={{ position: "absolute", bottom: "16px", right: "16px", zIndex: 1, opacity: hovered ? 1 : 0.3, transition: "all 0.2s ease", transform: hovered ? "translate(1px, -1px)" : "none" }}>
                    <svg width="14" height="14" fill="none" stroke={accent} strokeWidth="2" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
                    </svg>
                </div>
            </div>
        </Link>
    );
}

/* ─────────────────────── StatCard ──────────────────────────── */
function StatCard({ value, label, sub, color, icon }: { value: string | number; label: string; sub: string; color: string; icon: React.ReactNode }) {
    return (
        <div style={{
            flex: "1 1 160px", padding: "20px 22px", borderRadius: "14px",
            background: "#0d0f1a", border: "1px solid rgba(255,255,255,0.07)",
            display: "flex", flexDirection: "column", gap: "10px",
            transition: "border-color 0.2s",
        }}
            onMouseEnter={e => (e.currentTarget as HTMLElement).style.borderColor = `${color}44`}
            onMouseLeave={e => (e.currentTarget as HTMLElement).style.borderColor = "rgba(255,255,255,0.07)"}
        >
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <span style={{ fontSize: "11px", fontWeight: 600, color: "#4B5563", letterSpacing: "0.05em", textTransform: "uppercase" }}>{label}</span>
                <div style={{ width: "30px", height: "30px", borderRadius: "8px", background: `${color}18`, color, display: "flex", alignItems: "center", justifyContent: "center" }}>
                    {icon}
                </div>
            </div>
            <div>
                <p style={{ fontSize: "28px", fontWeight: 800, color: "var(--text-primary)", margin: "0 0 2px", letterSpacing: "-0.04em", lineHeight: 1 }}>{value}</p>
                <p style={{ fontSize: "11px", color: "#6B7280", margin: 0 }}>{sub}</p>
            </div>
        </div>
    );
}

/* ─────────────────── QuickAction ───────────────────────────── */
function QuickAction({ href, label, desc, accent, icon }: { href: string; label: string; desc: string; accent: string; icon: React.ReactNode }) {
    const [h, setH] = React.useState(false);
    return (
        <Link href={href} style={{ textDecoration: "none" }}>
            <div onMouseEnter={() => setH(true)} onMouseLeave={() => setH(false)} style={{
                display: "flex", alignItems: "center", gap: "12px", padding: "12px 16px",
                borderRadius: "12px", border: h ? `1px solid ${accent}44` : "1px solid rgba(255,255,255,0.06)",
                background: h ? `${accent}0d` : "transparent",
                transition: "all 0.18s", cursor: "pointer",
            }}>
                <div style={{ width: "34px", height: "34px", borderRadius: "10px", background: `${accent}18`, color: accent, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                    {icon}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ fontSize: "13px", fontWeight: 700, color: "var(--text-primary)", margin: "0 0 2px" }}>{label}</p>
                    <p style={{ fontSize: "11px", color: "#6B7280", margin: 0 }}>{desc}</p>
                </div>
                <svg width="13" height="13" fill="none" stroke={accent} strokeWidth="2" viewBox="0 0 24 24" style={{ opacity: h ? 1 : 0.3, transition: "opacity 0.18s", flexShrink: 0 }}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
                </svg>
            </div>
        </Link>
    );
}

/* ─────────────────────────── Page ──────────────────────────── */
export default function DashboardHome() {
    const { showConnectModal, setShowConnectModal } = useDatabase();

    // live activity data
    const [conversations, setConversations] = useState<Conversation[]>([]);
    const [reports, setReports] = useState<SavedReport[]>([]);
    const [dashboardItems, setDashboardItems] = useState<DashboardItem[]>([]);
    const [loadingActivity, setLoadingActivity] = useState(true);

    // live DB stats
    const [dbTableCount, setDbTableCount]       = useState<number | null>(null);
    const [dbTotalRows, setDbTotalRows]         = useState<number | null>(null);
    const [schemaTablesForHome, setSchemaTablesForHome] = useState<any[]>([]);

    useEffect(() => {
        Promise.all([
            fetch("/api/conversations").then(r => r.ok ? r.json() : []),
            fetch("/api/report/save").then(r => r.ok ? r.json() : []),
            fetch("/api/dashboard").then(r => r.ok ? r.json() : []),
        ]).then(([convs, reps, dashes]) => {
            setConversations(Array.isArray(convs) ? convs.slice(0, 6) : []);
            setReports(Array.isArray(reps) ? reps.slice(0, 6) : []);
            setDashboardItems(Array.isArray(dashes) ? dashes : []);
        }).catch(() => {}).finally(() => setLoadingActivity(false));

        // Fetch schema to get real table + row counts
        fetch("/api/schema").then(r => r.ok ? r.json() : null).then(d => {
            if (d?.tables) {
                setDbTableCount(d.tables.length);
                setSchemaTablesForHome(d.tables);
                setDbTotalRows((d.tables as any[]).reduce((sum: number, t: any) => sum + (t.rowCount ?? 0), 0));
            }
        }).catch(() => {});
    }, []);

    const activeDays = React.useMemo(() => {
        const set = new Set<string>();
        conversations.forEach(c => set.add(new Date(c.updatedAt).toDateString()));
        return set.size;
    }, [conversations]);

    return (
        <div style={{ display: "flex", flexDirection: "column", gap: "28px", paddingBottom: "32px" }}>

            {/* ── Hero ─────────────────────────────────────────── */}
            <div style={{ display: "flex", gap: "32px", alignItems: "flex-start", flexWrap: "wrap" }}>
                {/* Left copy */}
                <div style={{ flex: "1 1 320px", paddingTop: "8px" }}>
                    <p style={{ fontSize: "11px", fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", color: "#6366f1", marginBottom: "16px" }}>
                        AI-POWERED SQL ASSISTANT
                    </p>
                    <h1 style={{ fontSize: "clamp(28px, 4vw, 44px)", fontWeight: 900, color: "var(--text-primary)", lineHeight: 1.15, letterSpacing: "-0.03em", margin: "0 0 16px" }}>
                        Chat with your<br />
                        Database.{" "}
                        <span style={{ background: "linear-gradient(135deg,#6366f1,#8b5cf6)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>Naturally.</span>
                    </h1>
                    <p style={{ fontSize: "14px", color: "var(--text-secondary)", lineHeight: 1.65, marginBottom: "28px", maxWidth: "420px" }}>
                        Ask questions, generate SQL, visualize results, and build reports — all in one place.
                    </p>
                    <div style={{ display: "flex", gap: "12px", flexWrap: "wrap" }}>
                        <Link href="/dashboard/query-studio" style={{ display: "inline-flex", alignItems: "center", gap: "8px", padding: "10px 22px", borderRadius: "10px", background: "linear-gradient(135deg,#6366f1,#8b5cf6)", color: "var(--text-primary)", fontSize: "13px", fontWeight: 700, textDecoration: "none", boxShadow: "0 4px 18px rgba(99,102,241,0.3)", transition: "filter 0.15s" }}
                            onMouseEnter={e => (e.currentTarget as HTMLElement).style.filter = "brightness(1.1)"}
                            onMouseLeave={e => (e.currentTarget as HTMLElement).style.filter = "none"}>
                            Start Asking
                            <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" /></svg>
                        </Link>
                        <button onClick={() => setShowConnectModal(true)} style={{ display: "inline-flex", alignItems: "center", gap: "8px", padding: "10px 22px", borderRadius: "10px", cursor: "pointer", background: "rgba(255,255,255,0.04)", color: "var(--text-secondary)", fontSize: "13px", fontWeight: 600, border: "1px solid rgba(255,255,255,0.1)", transition: "all 0.15s" }}
                            onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = "#fff"; (e.currentTarget as HTMLElement).style.borderColor = "rgba(255,255,255,0.2)"; }}
                            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = "#9CA3AF"; (e.currentTarget as HTMLElement).style.borderColor = "rgba(255,255,255,0.1)"; }}>
                            Explore Features
                        </button>
                    </div>
                </div>

                {/* Right: SQL demo card */}
                <div style={{ flex: "1 1 360px", maxWidth: "460px" }}>
                    <div style={{ borderRadius: "16px", border: "1px solid var(--border)", background: "#0a0c18", overflow: "hidden", boxShadow: "0 20px 60px rgba(0,0,0,0.5)" }}>
                        <div style={{ padding: "16px 16px 14px", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
                            <div style={{ display: "flex", alignItems: "flex-start", gap: "10px" }}>
                                <div style={{ width: "28px", height: "28px", borderRadius: "50%", background: "linear-gradient(135deg,#6366f1,#8b5cf6)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                                    <svg width="13" height="13" fill="none" stroke="white" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0" /></svg>
                                </div>
                                <div style={{ background: "rgba(255,255,255,0.05)", borderRadius: "12px", borderTopLeftRadius: "4px", padding: "10px 14px", fontSize: "12px", color: "#D1D5DB", lineHeight: 1.55, maxWidth: "280px" }}>
                                    How many sales were made last month and what's the total revenue?
                                </div>
                            </div>
                        </div>
                        <div style={{ padding: "14px 16px", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
                            <div style={{ display: "flex", alignItems: "center", gap: "6px", marginBottom: "10px" }}>
                                <span style={{ width: "6px", height: "6px", borderRadius: "50%", background: "#6366f1", display: "inline-block" }} />
                                <span style={{ fontSize: "10px", fontWeight: 700, color: "#6366f1", textTransform: "uppercase", letterSpacing: "0.1em" }}>SQL</span>
                            </div>
                            <pre style={{ margin: 0, padding: "12px 14px", borderRadius: "10px", background: "rgba(0,0,0,0.4)", fontSize: "11px", fontFamily: "monospace", lineHeight: 1.7, color: "#94a3b8", overflow: "auto" }}>
                                <span style={{ color: "#818cf8" }}>SELECT</span>{"\n"}
                                {"  "}<span style={{ color: "#22d3ee" }}>COUNT(*)</span>{" "}as total_sales,{"\n"}
                                {"  "}<span style={{ color: "#22d3ee" }}>SUM(revenue)</span>{" "}as total_revenue{"\n"}
                                <span style={{ color: "#818cf8" }}>FROM</span>{" "}sales{"\n"}
                                <span style={{ color: "#818cf8" }}>WHERE</span>{" "}created_at {">="}  {"\n"}
                                {"  "}DATE_TRUNC(<span style={{ color: "#a3e635" }}>'month'</span>,{"\n"}
                                {"  "}CURRENT_DATE - INTERVAL <span style={{ color: "#a3e635" }}>'1 month'</span>);
                            </pre>
                        </div>
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

            {/* ── Tool cards ───────────────────────────────────── */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: "14px" }}>
                {TOOLS.map(t => <ToolCard key={t.href} {...t} />)}
            </div>

            {/* ── Stats row ────────────────────────────────────── */}
            <div style={{ display: "flex", gap: "14px", flexWrap: "wrap" }}>
                <StatCard
                    value={loadingActivity ? "—" : conversations.length >= 6 ? "6+" : String(conversations.length)}
                    label="Conversations"
                    sub="Total chat sessions"
                    color="#6366f1"
                    icon={<svg width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M7.5 8.25h9m-9 3H12m-9.75 1.51c0 1.6 1.123 2.994 2.707 3.227 1.129.166 2.27.293 3.423.379.35.026.67.21.865.501L12 21l2.755-4.133a1.14 1.14 0 01.865-.501 48.172 48.172 0 003.423-.379c1.584-.233 2.707-1.626 2.707-3.228V6.741c0-1.602-1.123-2.995-2.707-3.228A48.394 48.394 0 0012 3c-2.392 0-4.744.175-7.043.513C3.373 3.746 2.25 5.14 2.25 6.741v6.018z" /></svg>}
                />
                <StatCard
                    value={loadingActivity ? "—" : reports.length >= 6 ? "6+" : String(reports.length)}
                    label="Saved Reports"
                    sub="Reports built & saved"
                    color="#10b981"
                    icon={<svg width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M17.593 3.322c1.1.128 1.907 1.077 1.907 2.185V21L12 17.25 4.5 21V5.507c0-1.108.806-2.057 1.907-2.185a48.507 48.507 0 0111.186 0z" /></svg>}
                />
                <StatCard
                    value={loadingActivity ? "—" : activeDays}
                    label="Active Days"
                    sub="Days with queries this period"
                    color="#f59e0b"
                    icon={<svg width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5" /></svg>}
                />
                <StatCard
                    value={dbTableCount !== null ? dbTableCount : "—"}
                    label="DB Tables"
                    sub={dbTotalRows !== null ? `${dbTotalRows.toLocaleString()} total rows` : "Connected database"}
                    color="#3b82f6"
                    icon={<svg width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M20.25 6.375c0 2.278-3.694 4.125-8.25 4.125S3.75 8.653 3.75 6.375m16.5 0c0-2.278-3.694-4.125-8.25-4.125S3.75 4.097 3.75 6.375m16.5 0v11.25c0 2.278-3.694 4.125-8.25 4.125s-8.25-1.847-8.25-4.125V6.375m16.5 2.625c0 2.278-3.694 4.125-8.25 4.125s-8.25-1.847-8.25-4.125" /></svg>}
                />
                <StatCard
                    value="5"
                    label="Tools Available"
                    sub="Query · Visualize · Report · Profile · Schema"
                    color="#8b5cf6"
                    icon={<svg width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M11.42 15.17L17.25 21A2.652 2.652 0 0021 17.25l-5.877-5.877M11.42 15.17l2.496-3.03c.317-.384.74-.626 1.208-.766M11.42 15.17l-4.655 5.653a2.548 2.548 0 11-3.586-3.586l6.837-5.63m5.108-.233c.55-.164 1.163-.188 1.743-.14a4.5 4.5 0 004.486-6.336l-3.276 3.277a3.004 3.004 0 01-2.25-2.25l3.276-3.276a4.5 4.5 0 00-6.336 4.486c.091 1.076-.071 2.264-.904 2.95l-.102.085m-1.745 1.437L5.909 7.5H4.5L2.25 3.75l1.5-1.5L7.5 4.5v1.409l4.26 4.26m-1.745 1.437l1.745-1.437m6.615 8.206L15.75 15.75M4.867 19.125h.008v.008h-.008v-.008z" /></svg>}
                />
            </div>

            {/* ── Activity + Quick Actions ──────────────────────── */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px" }}>

                {/* Recent Conversations */}
                <div style={{ background: "#0d0f1a", border: "1px solid rgba(255,255,255,0.07)", borderRadius: "16px", overflow: "hidden" }}>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "16px 20px", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                            <div style={{ width: "7px", height: "7px", borderRadius: "50%", background: "#6366f1" }} />
                            <span style={{ fontSize: "13px", fontWeight: 700, color: "var(--text-primary)" }}>Recent Conversations</span>
                        </div>
                        <Link href="/dashboard/history" style={{ fontSize: "11px", color: "#6366f1", textDecoration: "none", fontWeight: 600 }}>View all →</Link>
                    </div>
                    <div style={{ padding: "8px 0" }}>
                        {loadingActivity && (
                            <div style={{ display: "flex", alignItems: "center", justifyContent: "center", padding: "32px 0", gap: "10px", color: "#4B5563", fontSize: "12px" }}>
                                <div style={{ width: "14px", height: "14px", border: "2px solid rgba(99,102,241,0.2)", borderTop: "2px solid #6366f1", borderRadius: "50%", animation: "spin 0.7s linear infinite" }} />
                                Loading…
                            </div>
                        )}
                        {!loadingActivity && conversations.length === 0 && (
                            <div style={{ padding: "32px 20px", textAlign: "center" }}>
                                <p style={{ fontSize: "13px", color: "#4B5563", margin: "0 0 10px" }}>No conversations yet.</p>
                                <Link href="/dashboard/query-studio" style={{ fontSize: "12px", color: "#818cf8", textDecoration: "none", fontWeight: 600 }}>Start your first query →</Link>
                            </div>
                        )}
                        {!loadingActivity && conversations.map((c, i) => (
                            <Link key={c.id} href="/dashboard/history" style={{ textDecoration: "none" }}>
                                <div style={{ display: "flex", alignItems: "center", gap: "12px", padding: "10px 20px", borderBottom: i < conversations.length - 1 ? "1px solid rgba(255,255,255,0.04)" : "none", transition: "background 0.15s", cursor: "pointer" }}
                                    onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = "rgba(255,255,255,0.02)"}
                                    onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = "transparent"}>
                                    <div style={{ width: "30px", height: "30px", borderRadius: "8px", background: "rgba(99,102,241,0.12)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                                        <svg width="13" height="13" fill="none" stroke="#818cf8" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M7.5 8.25h9m-9 3H12m-9.75 1.51c0 1.6 1.123 2.994 2.707 3.227 1.129.166 2.27.293 3.423.379.35.026.67.21.865.501L12 21l2.755-4.133a1.14 1.14 0 01.865-.501 48.172 48.172 0 003.423-.379c1.584-.233 2.707-1.626 2.707-3.228V6.741c0-1.602-1.123-2.995-2.707-3.228A48.394 48.394 0 0012 3c-2.392 0-4.744.175-7.043.513C3.373 3.746 2.25 5.14 2.25 6.741v6.018z" /></svg>
                                    </div>
                                    <div style={{ flex: 1, minWidth: 0 }}>
                                        <p style={{ fontSize: "12px", fontWeight: 600, color: "#D1D5DB", margin: "0 0 2px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{c.title}</p>
                                        <p style={{ fontSize: "10px", color: "#4B5563", margin: 0 }}>{timeAgo(c.updatedAt)}</p>
                                    </div>
                                    <svg width="12" height="12" fill="none" stroke="#374151" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" /></svg>
                                </div>
                            </Link>
                        ))}
                    </div>
                </div>

                {/* Right column: Saved Reports + Quick Actions stacked */}
                <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>

                    {/* Saved Reports */}
                    <div style={{ background: "#0d0f1a", border: "1px solid rgba(255,255,255,0.07)", borderRadius: "16px", overflow: "hidden" }}>
                        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "16px 20px", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
                            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                                <div style={{ width: "7px", height: "7px", borderRadius: "50%", background: "#10b981" }} />
                                <span style={{ fontSize: "13px", fontWeight: 700, color: "var(--text-primary)" }}>Saved Reports</span>
                            </div>
                            <Link href="/dashboard/saved-queries" style={{ fontSize: "11px", color: "#10b981", textDecoration: "none", fontWeight: 600 }}>View all →</Link>
                        </div>
                        <div style={{ padding: "8px 0" }}>
                            {loadingActivity && (
                                <div style={{ display: "flex", alignItems: "center", justifyContent: "center", padding: "24px 0", gap: "10px", color: "#4B5563", fontSize: "12px" }}>
                                    <div style={{ width: "14px", height: "14px", border: "2px solid rgba(16,185,129,0.2)", borderTop: "2px solid #10b981", borderRadius: "50%", animation: "spin 0.7s linear infinite" }} />
                                    Loading…
                                </div>
                            )}
                            {!loadingActivity && reports.length === 0 && (
                                <div style={{ padding: "20px", textAlign: "center" }}>
                                    <p style={{ fontSize: "12px", color: "#4B5563", margin: "0 0 8px" }}>No reports saved yet.</p>
                                    <Link href="/dashboard/report-builder" style={{ fontSize: "12px", color: "#34d399", textDecoration: "none", fontWeight: 600 }}>Build your first report →</Link>
                                </div>
                            )}
                            {!loadingActivity && reports.map((r, i) => (
                                <Link key={r.id} href="/dashboard/saved-queries" style={{ textDecoration: "none" }}>
                                    <div style={{ display: "flex", alignItems: "center", gap: "12px", padding: "9px 20px", borderBottom: i < reports.length - 1 ? "1px solid rgba(255,255,255,0.04)" : "none", transition: "background 0.15s", cursor: "pointer" }}
                                        onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = "rgba(255,255,255,0.02)"}
                                        onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = "transparent"}>
                                        <div style={{ width: "30px", height: "30px", borderRadius: "8px", background: "rgba(16,185,129,0.1)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                                            <svg width="13" height="13" fill="none" stroke="#10b981" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" /></svg>
                                        </div>
                                        <div style={{ flex: 1, minWidth: 0 }}>
                                            <p style={{ fontSize: "12px", fontWeight: 600, color: "#D1D5DB", margin: "0 0 2px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{r.title}</p>
                                            <p style={{ fontSize: "10px", color: "#4B5563", margin: 0 }}>{r.chartType ? `${r.chartType} chart · ` : ""}{timeAgo(r.createdAt)}</p>
                                        </div>
                                        <svg width="12" height="12" fill="none" stroke="#374151" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" /></svg>
                                    </div>
                                </Link>
                            ))}
                        </div>
                    </div>

                    {/* Quick Actions */}
                    <div style={{ background: "#0d0f1a", border: "1px solid rgba(255,255,255,0.07)", borderRadius: "16px", padding: "16px 20px" }}>
                        <p style={{ fontSize: "13px", fontWeight: 700, color: "var(--text-primary)", margin: "0 0 14px" }}>Quick Actions</p>
                        <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                            <QuickAction href="/dashboard/query-studio" label="New Query" desc="Ask a question in plain English" accent="#6366f1"
                                icon={<svg width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" /></svg>}
                            />
                            <QuickAction href="/dashboard/schema-explorer" label="Browse Schema" desc="Explore tables and relationships" accent="#f59e0b"
                                icon={<svg width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M3.75 9h16.5m-16.5 6.75h16.5" /></svg>}
                            />
                            <QuickAction href="/dashboard/report-builder" label="Build Report" desc="Generate an executive summary" accent="#10b981"
                                icon={<svg width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" /></svg>}
                            />
                        </div>
                    </div>

                    {/* DB Tables summary */}
                    {dbTableCount !== null && dbTableCount > 0 && (
                        <div style={{ background: "#0d0f1a", border: "1px solid rgba(255,255,255,0.07)", borderRadius: "16px", overflow: "hidden" }}>
                            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 20px", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
                                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                                    <div style={{ width: "7px", height: "7px", borderRadius: "50%", background: "#3b82f6" }} />
                                    <span style={{ fontSize: "13px", fontWeight: 700, color: "var(--text-primary)" }}>Your Database</span>
                                </div>
                                <Link href="/dashboard/schema-explorer" style={{ fontSize: "11px", color: "#3b82f6", textDecoration: "none", fontWeight: 600 }}>Explore →</Link>
                            </div>
                            <div style={{ padding: "8px 0" }}>
                                {/* We already have table info in dbTableCount, but need actual table rows. Re-use the schema data. */}
                                {schemaTablesForHome.slice(0, 5).map((t: any, i: number) => (
                                    <Link key={t.name} href="/dashboard/database-browser" style={{ textDecoration: "none" }}>
                                        <div style={{ display: "flex", alignItems: "center", gap: "12px", padding: "9px 20px", borderBottom: i < Math.min(schemaTablesForHome.length, 5) - 1 ? "1px solid rgba(255,255,255,0.04)" : "none", transition: "background 0.15s" }}
                                            onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = "rgba(255,255,255,0.02)"}
                                            onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = "transparent"}>
                                            <div style={{ width: "30px", height: "30px", borderRadius: "8px", background: "rgba(59,130,246,0.1)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                                                <svg width="13" height="13" fill="none" stroke="#3b82f6" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M20.25 6.375c0 2.278-3.694 4.125-8.25 4.125S3.75 8.653 3.75 6.375m16.5 0c0-2.278-3.694-4.125-8.25-4.125S3.75 4.097 3.75 6.375m16.5 0v11.25c0 2.278-3.694 4.125-8.25 4.125s-8.25-1.847-8.25-4.125V6.375m16.5 2.625c0 2.278-3.694 4.125-8.25 4.125s-8.25-1.847-8.25-4.125" /></svg>
                                            </div>
                                            <div style={{ flex: 1, minWidth: 0 }}>
                                                <p style={{ fontSize: "12px", fontWeight: 600, color: "#D1D5DB", margin: "0 0 2px", fontFamily: "monospace", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{t.name}</p>
                                                <p style={{ fontSize: "10px", color: "#4B5563", margin: 0 }}>{t.rowCount.toLocaleString()} rows · {t.columns?.length ?? 0} columns</p>
                                            </div>
                                        </div>
                                    </Link>
                                ))}
                                {schemaTablesForHome.length > 5 && (
                                    <p style={{ fontSize: "11px", color: "#374151", textAlign: "center", padding: "8px 20px", margin: 0 }}>
                                        +{schemaTablesForHome.length - 5} more tables
                                    </p>
                                )}
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* ── Pinned Dashboard ───────────────────────────────── */}
            {!loadingActivity && dashboardItems.length > 0 && (
                <div style={{ background: "#0d0f1a", border: "1px solid rgba(255,255,255,0.07)", borderRadius: "16px", padding: "20px 24px" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "16px" }}>
                        <div style={{ width: "8px", height: "8px", borderRadius: "50%", background: "#10b981" }} />
                        <h2 style={{ fontSize: "15px", fontWeight: 700, color: "var(--text-primary)", margin: 0 }}>Pinned Dashboard</h2>
                    </div>
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: "16px" }}>
                        {dashboardItems.map(item => (
                            <div key={item.id} style={{
                                background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)",
                                borderRadius: "12px", padding: "16px", display: "flex", flexDirection: "column", gap: "10px"
                            }}>
                                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                                    <h3 style={{ fontSize: "14px", fontWeight: 700, color: "#E5E7EB", margin: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                                        {item.title}
                                    </h3>
                                    <button 
                                        onClick={async (e) => {
                                            e.preventDefault();
                                            await fetch(`/api/dashboard?id=${item.id}`, { method: "DELETE" });
                                            setDashboardItems(prev => prev.filter(p => p.id !== item.id));
                                        }}
                                        style={{ background: "none", border: "none", color: "#6B7280", cursor: "pointer", padding: "4px" }}
                                    >
                                        <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
                                    </button>
                                </div>
                                <div style={{ background: "rgba(0,0,0,0.3)", borderRadius: "8px", padding: "10px", fontSize: "11px", color: "#9CA3AF", fontFamily: "monospace", overflow: "hidden", textOverflow: "ellipsis", display: "-webkit-box", WebkitLineClamp: 3, WebkitBoxOrient: "vertical" }}>
                                    {item.sql}
                                </div>
                                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: "auto" }}>
                                    <span style={{ fontSize: "10px", color: "#6B7280", textTransform: "uppercase", fontWeight: 700 }}>
                                        {item.type}
                                    </span>
                                    <Link href="/dashboard/query-studio" style={{ fontSize: "11px", color: "#818cf8", textDecoration: "none", fontWeight: 600 }}>
                                        Open in Studio →
                                    </Link>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* ── Ready to connect + badges ────────────────────── */}
            <div style={{ display: "flex", gap: "24px", flexWrap: "wrap", alignItems: "flex-start", padding: "24px 28px", borderRadius: "16px", border: "1px solid rgba(255,255,255,0.07)", background: "#0d0f1a" }}>
                {/* CTA */}
                <div style={{ flexShrink: 0, minWidth: "200px" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "4px" }}>
                        <svg width="16" height="16" fill="none" stroke="#6366f1" strokeWidth="2" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M20.25 6.375c0 2.278-3.694 4.125-8.25 4.125S3.75 8.653 3.75 6.375m16.5 0c0-2.278-3.694-4.125-8.25-4.125S3.75 4.097 3.75 6.375m16.5 0v11.25c0 2.278-3.694 4.125-8.25 4.125s-8.25-1.847-8.25-4.125V6.375m16.5 2.625c0 2.278-3.694 4.125-8.25 4.125s-8.25-1.847-8.25-4.125" />
                        </svg>
                        <h3 style={{ fontSize: "15px", fontWeight: 700, color: "var(--text-primary)", margin: 0 }}>Ready to connect?</h3>
                    </div>
                    <p style={{ fontSize: "12px", color: "#6B7280", lineHeight: 1.55, marginBottom: "16px" }}>
                        Connect your PostgreSQL database securely and start asking questions.
                    </p>
                    <button onClick={() => setShowConnectModal(true)} style={{ display: "inline-flex", alignItems: "center", gap: "8px", padding: "9px 18px", borderRadius: "9px", cursor: "pointer", background: "linear-gradient(135deg,#6366f1,#8b5cf6)", color: "var(--text-primary)", fontSize: "12px", fontWeight: 700, border: "none", boxShadow: "0 4px 14px rgba(99,102,241,0.25)", transition: "filter 0.15s" }}
                        onMouseEnter={e => (e.currentTarget as HTMLElement).style.filter = "brightness(1.1)"}
                        onMouseLeave={e => (e.currentTarget as HTMLElement).style.filter = "none"}>
                        <svg width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M13.19 8.688a4.5 4.5 0 011.242 7.244l-4.5 4.5a4.5 4.5 0 01-6.364-6.364l1.757-1.757m13.35-.622l1.757-1.757a4.5 4.5 0 00-6.364-6.364l-4.5 4.5a4.5 4.5 0 001.242 7.244" /></svg>
                        Connect Database
                    </button>
                </div>

                {/* Divider */}
                <div style={{ width: "1px", background: "rgba(255,255,255,0.06)", alignSelf: "stretch" }} />

                {/* Badges */}
                <div style={{ flex: 1, display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))", gap: "20px" }}>
                    {BADGES.map(b => (
                        <div key={b.label} style={{ display: "flex", alignItems: "flex-start", gap: "10px" }}>
                            <div style={{ width: "30px", height: "30px", borderRadius: "8px", background: `${b.color}18`, color: b.color, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                                {b.icon}
                            </div>
                            <div>
                                <p style={{ fontSize: "12px", fontWeight: 600, color: "var(--text-primary)", margin: "0 0 2px" }}>{b.label}</p>
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

            <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        </div>
    );
}
