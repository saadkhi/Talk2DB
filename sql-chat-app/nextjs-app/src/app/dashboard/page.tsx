"use client";

import React from "react";
import Link from "next/link";
import { useDatabase } from "@/context/DatabaseContext";
import ConnectDBModal from "@/components/dashboard/ConnectDBModal";

const TOOLS = [
    {
        href: "/dashboard/query-studio",
        title: "Query Studio",
        description: "Write or generate SQL in plain English. Instant, secure execution.",
        color: "#6366f1",
        bg: "rgba(99,102,241,0.12)",
        icon: (
            <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M17.25 6.75L22.5 12l-5.25 5.25m-10.5 0L1.5 12l5.25-5.25m7.5-3l-4.5 16.5" />
            </svg>
        ),
    },
    {
        href: "/dashboard/data-visualizer",
        title: "Data Visualizer",
        description: "Turn your data into beautiful charts and dashboards.",
        color: "#3b82f6",
        bg: "rgba(59,130,246,0.12)",
        icon: (
            <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M7.5 14.25v2.25m3-4.5v4.5m3-6.75v6.75m3-9v9M6 20.25h12A2.25 2.25 0 0020.25 18V6A2.25 2.25 0 0018 3.75H6A2.25 2.25 0 003.75 6v12A2.25 2.25 0 006 20.25z" />
            </svg>
        ),
    },
    {
        href: "/dashboard/schema-explorer",
        title: "Schema Explorer",
        description: "Explore tables, columns, relationships with an interactive tree.",
        color: "#f59e0b",
        bg: "rgba(245,158,11,0.12)",
        icon: (
            <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6A2.25 2.25 0 016 3.75h2.25A2.25 2.25 0 0110.5 6v2.25a2.25 2.25 0 01-2.25 2.25H6a2.25 2.25 0 01-2.25-2.25V6zM3.75 15.75A2.25 2.25 0 016 13.5h2.25a2.25 2.25 0 012.25 2.25V18a2.25 2.25 0 01-2.25 2.25H6A2.25 2.25 0 013.75 18v-2.25zM13.5 6a2.25 2.25 0 012.25-2.25H18A2.25 2.25 0 0120.25 6v2.25A2.25 2.25 0 0118 10.5h-2.25a2.25 2.25 0 01-2.25-2.25V6zM13.5 15.75a2.25 2.25 0 012.25-2.25H18a2.25 2.25 0 012.25 2.25V18A2.25 2.25 0 0118 20.25h-2.25A2.25 2.25 0 0113.5 18v-2.25z" />
            </svg>
        ),
    },
    {
        href: "/dashboard/report-builder",
        title: "Report Builder",
        description: "Create insightful reports and executive summaries in one click.",
        color: "#10b981",
        bg: "rgba(16,185,129,0.12)",
        icon: (
            <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
            </svg>
        ),
    },
    {
        href: "/dashboard/data-profiler",
        title: "Data Profiler",
        description: "Analyze data quality, detect anomalies and column insights.",
        color: "#8b5cf6",
        bg: "rgba(139,92,246,0.12)",
        icon: (
            <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h3.75M9 15h3.75m-7.5 6H18a2.25 2.25 0 002.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 00-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 00.75-.75 2.25 2.25 0 00-.1-.664m-5.8 0A2.251 2.251 0 0113.5 2.25H15c1.012 0 1.867.668 2.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25zM6.75 12h.008v.008H6.75V12zm0 3h.008v.008H6.75V15zm0 3h.008v.008H6.75V18z" />
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
            <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
            </svg>
        ),
    },
    {
        label: "PostgreSQL Ready",
        sub: "Optimized for PostgreSQL databases.",
        color: "#3b82f6",
        icon: (
            <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M20.25 6.375c0 2.278-3.694 4.125-8.25 4.125S3.75 8.653 3.75 6.375m16.5 0c0-2.278-3.694-4.125-8.25-4.125S3.75 4.097 3.75 6.375m16.5 0v11.25c0 2.278-3.694 4.125-8.25 4.125s-8.25-1.847-8.25-4.125V6.375m16.5 2.625c0 2.278-3.694 4.125-8.25 4.125s-8.25-1.847-8.25-4.125" />
            </svg>
        ),
    },
    {
        label: "AI-Powered",
        sub: "Advanced AI models for accurate SQL generation.",
        color: "#a855f7",
        icon: (
            <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 00-2.456 2.456zM16.894 20.567L16.5 21.75l-.394-1.183a2.25 2.25 0 00-1.423-1.423L13.5 18.75l1.183-.394a2.25 2.25 0 001.423-1.423l.394-1.183.394 1.183a2.25 2.25 0 001.423 1.423l1.183.394-1.183.394a2.25 2.25 0 00-1.423 1.423z" />
            </svg>
        ),
    },
    {
        label: "Real-time Results",
        sub: "Get results and insights in real-time.",
        color: "#f59e0b",
        icon: (
            <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75z" />
            </svg>
        ),
    },
];

export default function DashboardHome() {
    const { dbConnected, loading, showConnectModal, setShowConnectModal } = useDatabase();

    return (
        <div className="w-full space-y-6 pb-8">

            {/* ── Hero Section ── */}
            <div className="relative flex flex-col lg:flex-row gap-6 items-start">

                {/* Left: headline + CTA */}
                <div className="flex-1 min-w-0 pt-2">
                    <p className="text-[11px] font-bold uppercase tracking-[0.15em] text-[#6366f1] mb-4">
                        AI-POWERED SQL ASSISTANT
                    </p>
                    <h1 className="text-4xl md:text-5xl font-extrabold text-white leading-tight mb-4 tracking-tight">
                        Chat with your<br />
                        Database.{" "}
                        <span className="text-[#6366f1]">Naturally.</span>
                    </h1>
                    <p className="text-[#9CA3AF] text-[15px] leading-relaxed mb-8 max-w-md">
                        Ask questions, generate SQL, visualize results, and build reports — all in one place.
                    </p>
                    <div className="flex items-center gap-3 flex-wrap">
                        <Link
                            href="/dashboard/query-studio"
                            className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#6366f1] hover:bg-[#5254cc] text-white text-[13px] font-semibold rounded-lg transition-all shadow-lg shadow-[#6366f1]/25"
                        >
                            Start Asking
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
                            </svg>
                        </Link>
                        <button className="inline-flex items-center gap-2 px-5 py-2.5 bg-transparent border border-white/10 hover:border-white/20 text-[#9CA3AF] hover:text-white text-[13px] font-semibold rounded-lg transition-all">
                            Explore Features
                        </button>
                    </div>
                </div>

                {/* Right: SQL demo preview card */}
                <div className="w-full lg:w-[440px] shrink-0">
                    <div className="rounded-2xl border border-white/[0.08] bg-[#0d0f1a] overflow-hidden shadow-2xl">
                        {/* Chat bubble */}
                        <div className="p-4 border-b border-white/[0.06]">
                            <div className="flex items-start gap-2.5">
                                <div className="w-7 h-7 rounded-full bg-gradient-to-br from-[#6366f1] to-[#8b5cf6] flex items-center justify-center shrink-0 mt-0.5">
                                    <svg className="w-3.5 h-3.5 text-white" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
                                    </svg>
                                </div>
                                <div className="bg-white/[0.05] rounded-xl rounded-tl-sm px-3.5 py-2.5 text-[12px] text-[#D1D5DB] leading-relaxed max-w-xs">
                                    How many sales were made last month and what's the total revenue?
                                </div>
                            </div>
                        </div>

                        {/* SQL output */}
                        <div className="p-4 border-b border-white/[0.06]">
                            <div className="flex items-center gap-2 mb-2">
                                <span className="w-1.5 h-1.5 rounded-full bg-[#6366f1]" />
                                <span className="text-[10px] font-bold text-[#6366f1] uppercase tracking-wider">SQL</span>
                            </div>
                            <pre className="text-[11px] text-[#94a3b8] font-mono leading-relaxed bg-black/30 rounded-lg p-3 overflow-x-auto">
                                <span className="text-[#6366f1]">SELECT</span>{"\n"}
                                {"  "}<span className="text-[#22d3ee]">COUNT(*)</span> as total_sales,{"\n"}
                                {"  "}<span className="text-[#22d3ee]">SUM(revenue)</span> as total_revenue{"\n"}
                                <span className="text-[#6366f1]">FROM</span> sales{"\n"}
                                <span className="text-[#6366f1]">WHERE</span> created_at {">="}{"\n"}
                                {"  "}DATE_TRUNC(<span className="text-[#a3e635]">'month'</span>,{"\n"}
                                {"  "}CURRENT_DATE - INTERVAL{" "}
                                <span className="text-[#a3e635]">'1 month'</span>);
                            </pre>
                        </div>

                        {/* Results preview */}
                        <div className="p-4">
                            <div className="flex items-center gap-2 mb-2">
                                <span className="w-1.5 h-1.5 rounded-full bg-[#10b981]" />
                                <span className="text-[10px] font-bold text-[#10b981] uppercase tracking-wider">Results</span>
                            </div>
                            <div className="rounded-lg overflow-hidden border border-white/[0.06]">
                                <table className="w-full text-[11px]">
                                    <thead>
                                        <tr className="bg-white/[0.04]">
                                            <th className="px-3 py-2 text-left text-[#6366f1] font-semibold">total_sales</th>
                                            <th className="px-3 py-2 text-left text-[#6366f1] font-semibold">total_revenue</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        <tr>
                                            <td className="px-3 py-2 text-[#D1D5DB] font-mono">1,250</td>
                                            <td className="px-3 py-2 text-[#D1D5DB] font-mono">$88,420.50</td>
                                        </tr>
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* ── Tool Cards ── */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
                {TOOLS.map((tool) => (
                    <Link
                        key={tool.href}
                        href={tool.href}
                        className="group relative flex flex-col gap-3 p-5 rounded-xl border border-white/[0.07] bg-[#0d0f1a] hover:border-white/[0.14] hover:bg-white/[0.03] transition-all duration-200"
                    >
                        {/* Icon */}
                        <div
                            className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0"
                            style={{ background: tool.bg, color: tool.color }}
                        >
                            {tool.icon}
                        </div>

                        <div className="flex-1">
                            <h3 className="text-[13px] font-bold text-white mb-1">{tool.title}</h3>
                            <p className="text-[11px] text-[#6B7280] leading-relaxed">{tool.description}</p>
                        </div>

                        {/* Arrow */}
                        <div className="flex items-center justify-end">
                            <svg
                                className="w-4 h-4 text-[#4B5563] group-hover:text-white group-hover:translate-x-0.5 transition-all"
                                fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"
                            >
                                <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
                            </svg>
                        </div>
                    </Link>
                ))}
            </div>

            {/* ── Ready to connect + feature badges ── */}
            <div className="rounded-2xl border border-white/[0.07] bg-[#0d0f1a] p-6 flex flex-col lg:flex-row items-start lg:items-center gap-6">

                {/* Connect CTA */}
                <div className="shrink-0">
                    <div className="flex items-center gap-2 mb-1">
                        <svg className="w-4 h-4 text-[#6366f1]" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M20.25 6.375c0 2.278-3.694 4.125-8.25 4.125S3.75 8.653 3.75 6.375m16.5 0c0-2.278-3.694-4.125-8.25-4.125S3.75 4.097 3.75 6.375m16.5 0v11.25c0 2.278-3.694 4.125-8.25 4.125s-8.25-1.847-8.25-4.125V6.375m16.5 2.625c0 2.278-3.694 4.125-8.25 4.125s-8.25-1.847-8.25-4.125" />
                        </svg>
                        <h3 className="text-[15px] font-bold text-white">Ready to connect?</h3>
                    </div>
                    <p className="text-[12px] text-[#6B7280] mb-4 max-w-[200px]">
                        Connect your PostgreSQL database securely and start asking questions.
                    </p>
                    <button
                        onClick={() => setShowConnectModal(true)}
                        className="flex items-center gap-2 px-4 py-2 bg-[#6366f1] hover:bg-[#5254cc] text-white text-[12px] font-semibold rounded-lg transition-all shadow-md shadow-[#6366f1]/20"
                    >
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M13.19 8.688a4.5 4.5 0 011.242 7.244l-4.5 4.5a4.5 4.5 0 01-6.364-6.364l1.757-1.757m13.35-.622l1.757-1.757a4.5 4.5 0 00-6.364-6.364l-4.5 4.5a4.5 4.5 0 001.242 7.244" />
                        </svg>
                        Connect Database
                    </button>
                </div>

                {/* Vertical divider */}
                <div className="hidden lg:block w-px self-stretch bg-white/[0.06] mx-2" />

                {/* Feature badges */}
                <div className="flex-1 grid grid-cols-2 xl:grid-cols-4 gap-4">
                    {BADGES.map((b) => (
                        <div key={b.label} className="flex items-start gap-2.5">
                            <div
                                className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0 mt-0.5"
                                style={{ background: `${b.color}18`, color: b.color }}
                            >
                                {b.icon}
                            </div>
                            <div>
                                <p className="text-[12px] font-semibold text-white leading-tight">{b.label}</p>
                                <p className="text-[11px] text-[#6B7280] leading-snug mt-0.5">{b.sub}</p>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Footer credit */}
            <p className="text-center text-[11px] text-[#374151]">
                Made with ♥ for data teams and curious minds. · © 2025 Talk2DB. All rights reserved.
            </p>

            <ConnectDBModal
                isOpen={showConnectModal}
                onClose={() => setShowConnectModal(false)}
            />
        </div>
    );
}
