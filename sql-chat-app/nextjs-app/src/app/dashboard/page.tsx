"use client";

import React from "react";
import { useDatabase } from "@/context/DatabaseContext";
import { useSession } from "next-auth/react";
import ToolCard from "@/components/dashboard/ToolCard";
import ConnectDBModal from "@/components/dashboard/ConnectDBModal";

const TOOLS = [
    {
        href: "/dashboard/query-studio",
        title: "Query Studio",
        description: "Write queries in plain English. Talk2DB translates it to safe SQL and runs it on your database instantly.",
        color: "#3B82F6", // Blue
        icon: (
            <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M17.25 6.75L22.5 12l-5.25 5.25m-10.5 0L1.5 12l5.25-5.25m7.5-3l-4.5 16.5" />
            </svg>
        ),
    },
    {
        href: "/dashboard/data-visualizer",
        title: "Data Visualizer",
        description: "Describe a chart in words and get it rendered using real-time query results from your dataset.",
        color: "#8B5CF6", // Purple
        icon: (
            <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 6a7.5 7.5 0 107.5 7.5h-7.5V6z" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 10.5H21A7.5 7.5 0 0013.5 3v7.5z" />
            </svg>
        ),
    },
    {
        href: "/dashboard/schema-explorer",
        title: "Schema Explorer",
        description: "Browse your tables, columns, constraints and data relationships in an interactive tree view layout.",
        color: "#F59E0B", // Yellow/Amber
        icon: (
            <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6A2.25 2.25 0 016 3.75h2.25A2.25 2.25 0 0110.5 6v2.25a2.25 2.25 0 01-2.25 2.25H6a2.25 2.25 0 01-2.25-2.25V6zM3.75 15.75A2.25 2.25 0 016 13.5h2.25a2.25 2.25 0 012.25 2.25V18a2.25 2.25 0 01-2.25 2.25H6A2.25 2.25 0 013.75 18v-2.25zM13.5 6a2.25 2.25 0 012.25-2.25H18A2.25 2.25 0 0120.25 6v2.25A2.25 2.25 0 0118 10.5h-2.25a2.25 2.25 0 01-2.25-2.25V6zM13.5 15.75a2.25 2.25 0 012.25-2.25H18a2.25 2.25 0 012.25 2.25V18A2.25 2.25 0 0118 20.25h-2.25A2.25 2.25 0 0113.5 18v-2.25z" />
            </svg>
        ),
    },
    {
        href: "/dashboard/report-builder",
        title: "Report Builder",
        description: "Generate structured management reports incorporating statistics, charting and executive summaries in one click.",
        color: "#10B981", // Green
        icon: (
            <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
            </svg>
        ),
    },
    {
        href: "/dashboard/data-profiler",
        title: "Data Profiler",
        description: "Run diagnostic metrics on data tables to audit data quality, value distributions, null ranges and anomalies.",
        color: "#06B6D4", // Cyan
        icon: (
            <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h3.75M9 15h3.375c.621 0 1.125-.504 1.125-1.125V11.25c0-.621-.504-1.125-1.125-1.125H9.75M3 16.251V12c0-3.313 2.687-6 6-6h6c3.313 0 6 2.687 6 6v4.251c0 .248-.053.494-.156.719l-.916 2.016A1.5 1.5 0 0118.57 21h-13.14a1.5 1.5 0 01-1.358-.864l-.916-2.016A1.624 1.624 0 013 16.25z" />
            </svg>
        ),
    },
];

export default function DashboardHome() {
    const { data: session } = useSession();
    const { dbConnected, loading, showConnectModal, setShowConnectModal } = useDatabase();

    const username = session?.user?.name || "there";

    return (
        <div className="w-full space-y-10 py-2">
            {/* Hero welcome header */}
            <div className="bg-[#1A1D27] border border-[#2C3142]/85 rounded-3xl p-8 md:p-10 relative overflow-hidden shadow-xl flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                {/* Visual gradient background blob */}
                <div className="absolute top-0 right-0 w-80 h-80 bg-blue-600/10 rounded-full blur-3xl -mr-20 -mt-20 pointer-events-none" />

                <div className="space-y-3 max-w-xl relative">
                    <h1 className="text-3xl md:text-4xl font-extrabold text-white tracking-tight leading-tight">
                        Welcome, <span className="text-blue-500 font-black">{username}</span>
                    </h1>
                    <p className="text-sm text-[#9CA3AF] leading-relaxed font-normal">
                        Talk2DB is your direct natural language gateway to relational databases. Ask questions, construct visual graphs, verify table profiles, and generate executive summaries with full AI translation.
                    </p>
                </div>

                {/* Main Hero CTA */}
                <div className="shrink-0 relative">
                    {loading ? (
                        <div className="h-10 w-36 bg-gray-800 rounded-xl animate-pulse" />
                    ) : dbConnected ? (
                        <a
                            href="/dashboard/query-studio"
                            className="inline-flex items-center gap-2 px-5 py-3 bg-blue-600 hover:bg-blue-550 text-white text-xs font-bold rounded-xl transition-all shadow-lg shadow-blue-600/20 active:translate-y-0.5 select-none"
                        >
                            Open Query Studio
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
                            </svg>
                        </a>
                    ) : (
                        <button
                            onClick={() => setShowConnectModal(true)}
                            className="inline-flex items-center gap-2 px-5 py-3 bg-red-650 hover:bg-red-600 text-white text-xs font-bold rounded-xl transition-all shadow-lg shadow-red-600/20 animate-bounce active:translate-y-0.5 select-none"
                        >
                            Connect Postgres URL
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                            </svg>
                        </button>
                    )}
                </div>
            </div>

            {/* Connection Information Banner */}
            {!loading && (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    {/* Database status card */}
                    <div className="bg-[#1A1D27] border border-[#2C3142]/85 p-5 rounded-2xl flex flex-col justify-center">
                        <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-2">Connection Status</span>
                        <div className="flex items-center gap-2">
                            <span
                                className="w-2.5 h-2.5 rounded-full shrink-0"
                                style={{
                                    backgroundColor: dbConnected ? "#10b981" : "#ef4444",
                                    boxShadow: dbConnected ? "0 0 8px #10b981" : "0 0 8px #ef4444"
                                }}
                            />
                            <span className="text-sm font-bold text-white leading-none">
                                {dbConnected ? "Active postgres" : "Disconnected"}
                            </span>
                        </div>
                    </div>

                    {/* Tables count card */}
                    <div className="bg-[#1A1D27] border border-[#2C3142]/85 p-5 rounded-2xl flex flex-col justify-center">
                        <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-2">Tables Indexed</span>
                        <span className="text-xl font-extrabold text-white leading-none">
                            {dbConnected ? "12 Tables" : "—"}
                        </span>
                    </div>

                    {/* Last query status card */}
                    <div className="bg-[#1A1D27] border border-[#2C3142]/85 p-5 rounded-2xl flex flex-col justify-center">
                        <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-2">Query Engine Latency</span>
                        <span className="text-sm font-bold text-white leading-none">
                            {dbConnected ? "42ms (Avg)" : "—"}
                        </span>
                    </div>

                    {/* Active DBMS card */}
                    <div className="bg-[#1A1D27] border border-[#2C3142]/85 p-5 rounded-2xl flex flex-col justify-center">
                        <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-2">DBMS Dialect</span>
                        <span className="text-sm font-bold text-white leading-none font-mono">
                            {dbConnected ? "PostgreSQL 15+" : "—"}
                        </span>
                    </div>
                </div>
            )}

            {/* Tools Grid Section */}
            <div className="space-y-6">
                <div>
                    <h2 className="text-xl font-bold text-white">Database Workspace Tools</h2>
                    <p className="text-xs text-[#9CA3AF] mt-1 select-none">
                        Please select one of the following interactive modules to analyze, chart, query, or check database architecture.
                    </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {TOOLS.map((tool) => (
                        <ToolCard
                            key={tool.href}
                            href={tool.href}
                            title={tool.title}
                            description={tool.description}
                            icon={tool.icon}
                            color={tool.color}
                            dbConnected={!!dbConnected}
                            onConnectPrompt={() => setShowConnectModal(true)}
                        />
                    ))}
                </div>
            </div>

            {/* Mount ConnectDBModal overlay */}
            <ConnectDBModal
                isOpen={showConnectModal}
                onClose={() => setShowConnectModal(false)}
            />
        </div>
    );
}
