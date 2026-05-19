"use client";
import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";

const tools = [
    {
        href: "/dashboard/query-studio",
        title: "Query Studio",
        icon: "🔍",
        color: "#6366f1",
        description: "Write queries in plain English. Get SQL + live results instantly from your database.",
    },
    {
        href: "/dashboard/data-visualizer",
        title: "Data Visualizer",
        icon: "📊",
        color: "#22d3ee",
        description: "Describe a chart in words. Get it rendered with your real data in seconds.",
    },
    {
        href: "/dashboard/schema-explorer",
        title: "Schema Explorer",
        icon: "🗂️",
        color: "#10b981",
        description: "Browse all your tables, columns, and data types in a visual tree view.",
    },
    {
        href: "/dashboard/report-builder",
        title: "Report Builder",
        icon: "📋",
        color: "#f59e0b",
        description: "One prompt generates a full report: table + chart + AI summary + insights.",
    },
    {
        href: "/dashboard/data-profiler",
        title: "Data Profiler",
        icon: "🧪",
        color: "#8b5cf6",
        description: "Profile any table for nulls, distributions, anomalies, and data quality issues.",
    },
];

export default function DashboardPage() {
    const { data: session } = useSession();
    const [dbConnected, setDbConnected] = useState<boolean | null>(null);
    const [showModal, setShowModal] = useState(false);
    const [connString, setConnString] = useState("");
    const [submitting, setSubmitting] = useState(false);
    const [errorBtn, setErrorBtn] = useState<string | null>(null);
    const [successMsg, setSuccessMsg] = useState<string | null>(null);

    // Check connection status on load
    useEffect(() => {
        async function checkStatus() {
            try {
                const res = await fetch("/api/user/profile");
                if (res.ok) {
                    const profile = await res.json();
                    setDbConnected(!!profile.dbConnectionString);
                    if (!profile.dbConnectionString) {
                        setShowModal(true);
                    }
                }
            } catch (err) {
                console.error("Failed to check profile", err);
            }
        }
        checkStatus();
    }, []);

    const handleConnectDb = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!connString) return;
        setSubmitting(true);
        setErrorBtn(null);
        setSuccessMsg(null);

        try {
            const res = await fetch("/api/user/connect-db", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ connectionString: connString, dialect: "postgresql" }),
            });

            const data = await res.json();
            if (!res.ok) {
                throw new Error(data.error || "Failed to connect to database");
            }

            setSuccessMsg("Database connected successfully!");
            setDbConnected(true);
            setTimeout(() => {
                setShowModal(false);
            }, 1500);
        } catch (err: any) {
            setErrorBtn(err.message || "Connection failed. Please check credentials.");
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div className="w-full">
            <div className="flex justify-between items-start mb-6">
                <div>
                    <h1 className="text-3xl font-bold text-white mb-2">Welcome to Talk2DB</h1>
                    <p className="text-gray-400">Your AI-powered data intelligence platform. Select a tool to get started.</p>
                </div>
                <button
                    onClick={() => setShowModal(true)}
                    className={`px-4 py-2 text-sm font-semibold rounded-xl border transition-all ${dbConnected
                            ? "border-[#10b981] bg-[#10b981]/10 text-[#10b981]"
                            : "border-[#ef4444] bg-[#ef4444]/10 text-[#ef4444] animate-pulse"
                        }`}
                >
                    {dbConnected ? "✓ Postgres DB Connected" : "⚠ DB Not Connected"}
                </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
                {tools.map((tool) => (
                    <Link
                        key={tool.href}
                        href={dbConnected ? tool.href : "#"}
                        onClick={(e) => {
                            if (!dbConnected) {
                                e.preventDefault();
                                setShowModal(true);
                            }
                        }}
                        className={`bg-[#1a1d2e] border ${dbConnected ? "border-[#2d3154] hover:border-indigo-500 cursor-pointer" : "border-red-950 opacity-60 cursor-not-allowed"
                            } rounded-2xl p-6 transition-all group`}
                    >
                        <div className="text-4xl mb-4">{tool.icon}</div>
                        <h3
                            className={`text-lg font-semibold text-white mb-2 ${dbConnected ? "group-hover:text-indigo-400" : ""
                                } transition-colors`}
                        >
                            {tool.title}
                        </h3>
                        <p className="text-gray-400 text-sm leading-relaxed">{tool.description}</p>
                    </Link>
                ))}
            </div>

            {/* Connection Modal */}
            {showModal && (
                <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
                    <div className="bg-[#1a1d2e] border border-[#2d3154] rounded-2xl w-full max-w-lg p-6 relative">
                        <button
                            onClick={() => {
                                if (dbConnected) {
                                    setShowModal(false);
                                } else {
                                    alert("Please connect your postgres database first to use other tools!");
                                }
                            }}
                            className="absolute top-4 right-4 text-gray-400 hover:text-white font-bold"
                        >
                            ✕
                        </button>

                        <h2 className="text-xl font-bold text-white mb-2">Connect Your Postgres Database</h2>
                        <p className="text-sm text-gray-400 mb-6">
                            Enter your database connection string to enable SQL model queries, Schema visualizers, Profilers and automated Analytics.
                        </p>

                        <form onSubmit={handleConnectDb} className="space-y-4">
                            {errorBtn && (
                                <div className="p-3 bg-red-950 border border-red-800 text-red-400 text-xs rounded-lg">
                                    {errorBtn}
                                </div>
                            )}
                            {successMsg && (
                                <div className="p-3 bg-emerald-950 border border-emerald-800 text-emerald-400 text-xs rounded-lg">
                                    {successMsg}
                                </div>
                            )}

                            <div className="flex flex-col gap-2">
                                <label className="text-xs font-semibold text-gray-300 uppercase tracking-wider">
                                    PostgreSQL Connection URL
                                </label>
                                <textarea
                                    placeholder="postgresql://username:password@hostname:5432/database?sslmode=require"
                                    value={connString}
                                    onChange={(e) => setConnString(e.target.value)}
                                    disabled={submitting}
                                    className="bg-[#0f1117] border border-[#2d3154] text-white p-3 rounded-lg text-sm w-full min-h-[90px] font-mono focus:outline-none focus:border-indigo-500"
                                    required
                                />
                            </div>

                            <div className="flex justify-end gap-3 mt-6">
                                {dbConnected && (
                                    <button
                                        type="button"
                                        onClick={() => setShowModal(false)}
                                        className="px-4 py-2 border border-[#2d3154] text-gray-300 rounded-lg hover:bg-[#242840] text-sm"
                                    >
                                        Cancel
                                    </button>
                                )}
                                <button
                                    type="submit"
                                    disabled={submitting}
                                    className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:bg-indigo-800 text-white font-semibold rounded-lg text-sm transition-all"
                                >
                                    {submitting ? "Testing & Connecting..." : "Verify & Save Connection"}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
