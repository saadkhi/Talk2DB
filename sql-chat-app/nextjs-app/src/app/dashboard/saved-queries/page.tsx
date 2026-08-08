"use client";
import React, { useEffect, useState } from "react";
import Link from "next/link";

interface SavedReport {
    id: string;
    title: string;
    prompt: string;
    sql: string;
    chartType: string | null;
    summary: string | null;
    insights: string[];
    createdAt: string;
}

interface SavedQuery {
    id: string;
    title: string;
    sql: string;
    tags: string[];
    createdAt: string;
}

function timeAgo(iso: string) {
    const diff = Date.now() - new Date(iso).getTime();
    const m = Math.floor(diff / 60000);
    if (m < 1) return "just now";
    if (m < 60) return `${m}m ago`;
    const h = Math.floor(m / 60);
    if (h < 24) return `${h}h ago`;
    return `${Math.floor(h / 24)}d ago`;
}

export default function SavedQueriesPage() {
    const [reports, setReports] = useState<SavedReport[]>([]);
    const [queries, setQueries] = useState<SavedQuery[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [deletingId, setDeletingId] = useState<string | null>(null);
    const [expanded, setExpanded] = useState<string | null>(null);
    const [activeTab, setActiveTab] = useState<"queries" | "reports">("queries");

    const fetchData = async () => {
        setLoading(true);
        setError(null);
        try {
            const [reportsRes, queriesRes] = await Promise.all([
                fetch("/api/report/save"),
                fetch("/api/query/saved")
            ]);
            
            const reportsData = await reportsRes.json();
            const queriesData = await queriesRes.json();
            
            if (!reportsRes.ok) throw new Error(reportsData.error || "Failed to load reports");
            if (!queriesRes.ok) throw new Error(queriesData.error || "Failed to load queries");
            
            setReports(reportsData);
            setQueries(queriesData);
        } catch (e: any) {
            setError(e.message);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { fetchData(); }, []);

    const handleDelete = async (id: string, type: "report" | "query") => {
        if (!confirm(`Are you sure you want to delete this ${type}?`)) return;
        setDeletingId(id);
        try {
            const endpoint = type === "report" ? `/api/report/save/${id}` : `/api/query/saved/${id}`;
            const res = await fetch(endpoint, { method: "DELETE" });
            if (!res.ok) { const d = await res.json(); throw new Error(d.error); }
            if (type === "report") {
                setReports(prev => prev.filter(r => r.id !== id));
            } else {
                setQueries(prev => prev.filter(q => q.id !== id));
            }
        } catch (e: any) {
            alert(e.message || "Delete failed");
        } finally {
            setDeletingId(null);
        }
    };

    const handleSchedule = async (id: string, cron: string) => {
        try {
            const res = await fetch("/api/report/schedule", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ reportId: id, cron })
            });
            if (!res.ok) throw new Error("Schedule failed");
            const updated = await res.json();
            setReports(p => p.map(r => r.id === id ? { ...r, schedule: updated.schedule } : r));
            alert(cron === "none" ? "Schedule removed." : `Scheduled successfully with cron: ${cron}`);
        } catch (err) {
            console.error(err);
            alert("Failed to update schedule.");
        }
    };

    return (
        <div style={{ maxWidth: "900px", margin: "0 auto", display: "flex", flexDirection: "column", gap: "24px" }}>
            {/* Header */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "12px" }}>
                <div>
                    <h1 style={{ fontSize: "22px", fontWeight: 800, color: "var(--text-primary)", margin: "0 0 4px", letterSpacing: "-0.03em" }}>Library</h1>
                    <p style={{ fontSize: "13px", color: "#6B7280", margin: 0 }}>Manage your saved queries and reports.</p>
                </div>
                <Link href="/dashboard/report-builder" style={{
                    display: "inline-flex", alignItems: "center", gap: "7px",
                    padding: "9px 18px", borderRadius: "9px", fontSize: "12px", fontWeight: 700,
                    background: "linear-gradient(135deg,#6366f1,#8b5cf6)", color: "var(--text-primary)",
                    textDecoration: "none", boxShadow: "0 4px 14px rgba(99,102,241,0.25)",
                    transition: "filter 0.15s",
                }}
                    onMouseEnter={e => (e.currentTarget as HTMLElement).style.filter = "brightness(1.1)"}
                    onMouseLeave={e => (e.currentTarget as HTMLElement).style.filter = "none"}
                >
                    <svg width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                    </svg>
                    New Report
                </Link>
            </div>

            {/* Tabs */}
            <div style={{ display: "flex", gap: "12px", borderBottom: "1px solid var(--border)", paddingBottom: "10px" }}>
                <button 
                    onClick={() => setActiveTab("queries")} 
                    style={{ 
                        background: activeTab === "queries" ? "rgba(99,102,241,0.15)" : "transparent",
                        border: "1px solid",
                        borderColor: activeTab === "queries" ? "rgba(99,102,241,0.3)" : "transparent",
                        color: activeTab === "queries" ? "#818cf8" : "#9CA3AF",
                        padding: "8px 16px", borderRadius: "8px", fontSize: "13px", fontWeight: 600, cursor: "pointer", transition: "all 0.15s"
                    }}
                >
                    Saved Queries
                </button>
                <button 
                    onClick={() => setActiveTab("reports")} 
                    style={{ 
                        background: activeTab === "reports" ? "rgba(99,102,241,0.15)" : "transparent",
                        border: "1px solid",
                        borderColor: activeTab === "reports" ? "rgba(99,102,241,0.3)" : "transparent",
                        color: activeTab === "reports" ? "#818cf8" : "#9CA3AF",
                        padding: "8px 16px", borderRadius: "8px", fontSize: "13px", fontWeight: 600, cursor: "pointer", transition: "all 0.15s"
                    }}
                >
                    Saved Reports
                </button>
            </div>

            {/* States */}
            {loading && (
                <div style={{ display: "flex", alignItems: "center", justifyContent: "center", padding: "60px 0", gap: "12px", color: "#6B7280", fontSize: "13px" }}>
                    <div style={{ width: "18px", height: "18px", border: "2px solid rgba(99,102,241,0.2)", borderTop: "2px solid #6366f1", borderRadius: "50%", animation: "spin 0.7s linear infinite" }} />
                    Loading saved reports…
                </div>
            )}
            {error && (
                <div style={{ background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.2)", borderRadius: "10px", padding: "14px 16px" }}>
                    <p style={{ fontSize: "12px", color: "#f87171", margin: 0 }}>⚠ {error}</p>
                </div>
            )}
            {!loading && !error && activeTab === "reports" && reports.length === 0 && (
                <div style={{ background: "#0d0f1a", border: "1px solid rgba(255,255,255,0.07)", borderRadius: "14px", padding: "48px 24px", textAlign: "center" }}>
                    <div style={{ width: "48px", height: "48px", borderRadius: "14px", background: "rgba(99,102,241,0.1)", border: "1px solid rgba(99,102,241,0.15)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 14px" }}>
                        <svg width="22" height="22" fill="none" stroke="#6366f1" strokeWidth="2" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M17.593 3.322c1.1.128 1.907 1.077 1.907 2.185V21L12 17.25 4.5 21V5.507c0-1.108.806-2.057 1.907-2.185a48.507 48.507 0 0111.186 0z" />
                        </svg>
                    </div>
                    <h3 style={{ fontSize: "15px", fontWeight: 700, color: "var(--text-primary)", margin: "0 0 6px" }}>No saved reports yet</h3>
                    <p style={{ fontSize: "12px", color: "#6B7280", margin: "0 0 18px" }}>Build a report and click "Save Report" to see it here.</p>
                    <Link href="/dashboard/report-builder" style={{ fontSize: "12px", fontWeight: 600, color: "#818cf8", textDecoration: "none" }}>
                        Go to Report Builder →
                    </Link>
                </div>
            )}
            
            {!loading && !error && activeTab === "queries" && queries.length === 0 && (
                <div style={{ background: "#0d0f1a", border: "1px solid rgba(255,255,255,0.07)", borderRadius: "14px", padding: "48px 24px", textAlign: "center" }}>
                    <div style={{ width: "48px", height: "48px", borderRadius: "14px", background: "rgba(99,102,241,0.1)", border: "1px solid rgba(99,102,241,0.15)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 14px" }}>
                        <svg width="22" height="22" fill="none" stroke="#6366f1" strokeWidth="2" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M5 12h14M5 12a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v4a2 2 0 01-2 2M5 12a2 2 0 00-2 2v4a2 2 0 002 2h14a2 2 0 002-2v-4a2 2 0 00-2-2m-2-4h.01M17 16h.01" />
                        </svg>
                    </div>
                    <h3 style={{ fontSize: "15px", fontWeight: 700, color: "var(--text-primary)", margin: "0 0 6px" }}>No saved queries yet</h3>
                    <p style={{ fontSize: "12px", color: "#6B7280", margin: "0 0 18px" }}>Run a query in Query Studio and click "Save Query" to see it here.</p>
                    <Link href="/dashboard/query-studio" style={{ fontSize: "12px", fontWeight: 600, color: "#818cf8", textDecoration: "none" }}>
                        Go to Query Studio →
                    </Link>
                </div>
            )}

            {/* Reports list */}
            {!loading && activeTab === "reports" && reports.map(report => (
                <div key={report.id} style={{ background: "#0d0f1a", border: "1px solid var(--border)", borderRadius: "14px", overflow: "hidden", transition: "border-color 0.15s" }}
                    onMouseEnter={e => (e.currentTarget as HTMLElement).style.borderColor = "rgba(99,102,241,0.3)"}
                    onMouseLeave={e => (e.currentTarget as HTMLElement).style.borderColor = "rgba(255,255,255,0.08)"}
                >
                    {/* Card header */}
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", padding: "18px 20px", gap: "12px" }}>
                        <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap", marginBottom: "4px" }}>
                                <h3 style={{ fontSize: "14px", fontWeight: 700, color: "var(--text-primary)", margin: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{report.title}</h3>
                                {report.chartType && (
                                    <span style={{ fontSize: "10px", fontWeight: 700, color: "#6366f1", background: "rgba(99,102,241,0.1)", border: "1px solid rgba(99,102,241,0.15)", borderRadius: "20px", padding: "1px 8px", letterSpacing: "0.06em", whiteSpace: "nowrap" }}>
                                        {report.chartType} chart
                                    </span>
                                )}
                            </div>
                            <p style={{ fontSize: "12px", color: "#6B7280", margin: 0 }}>
                                {report.prompt.length > 120 ? `${report.prompt.slice(0, 120)}…` : report.prompt}
                            </p>
                        </div>
                        <div style={{ display: "flex", alignItems: "center", gap: "8px", flexShrink: 0 }}>
                            <span style={{ fontSize: "11px", color: "#374151", whiteSpace: "nowrap" }}>{timeAgo(report.createdAt)}</span>
                            <button
                                onClick={() => setExpanded(expanded === report.id ? null : report.id)}
                                style={{ background: "rgba(255,255,255,0.04)", border: "1px solid var(--border)", color: "var(--text-secondary)", borderRadius: "7px", padding: "5px 12px", fontSize: "11px", fontWeight: 600, cursor: "pointer" }}
                            >
                                {expanded === report.id ? "Collapse" : "Expand"}
                            </button>
                            <button
                                onClick={() => handleDelete(report.id, "report")}
                                disabled={deletingId === report.id}
                                style={{ background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.15)", color: "#f87171", borderRadius: "7px", padding: "5px 10px", fontSize: "11px", cursor: deletingId === report.id ? "not-allowed" : "pointer", display: "flex", alignItems: "center", gap: "4px" }}
                            >
                                <svg width="11" height="11" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
                                </svg>
                                {deletingId === report.id ? "…" : "Delete"}
                            </button>
                        </div>
                    </div>

                    {/* Expanded details */}
                    {expanded === report.id && (
                        <div style={{ borderTop: "1px solid rgba(255,255,255,0.06)", padding: "18px 20px", display: "flex", flexDirection: "column", gap: "16px" }}>
                            
                            <div style={{ background: "rgba(16,185,129,0.05)", border: "1px solid rgba(16,185,129,0.15)", borderRadius: "10px", padding: "12px 14px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                                <div>
                                    <p style={{ fontSize: "10px", fontWeight: 700, color: "#10b981", textTransform: "uppercase", letterSpacing: "0.08em", margin: "0 0 4px" }}>Schedule (Email)</p>
                                    <p style={{ fontSize: "12px", color: "var(--text-secondary)", margin: 0 }}>
                                        Current: <strong style={{ color: "var(--text-primary)" }}>{report.schedule ? report.schedule : "Not scheduled"}</strong>
                                    </p>
                                </div>
                                <div style={{ display: "flex", gap: "6px" }}>
                                    <button onClick={() => handleSchedule(report.id, "0 9 * * *")} style={{ padding: "4px 10px", fontSize: "11px", borderRadius: "6px", background: "rgba(16,185,129,0.1)", border: "1px solid rgba(16,185,129,0.2)", color: "#10b981", cursor: "pointer" }}>Daily 9am</button>
                                    <button onClick={() => handleSchedule(report.id, "0 9 * * 1")} style={{ padding: "4px 10px", fontSize: "11px", borderRadius: "6px", background: "rgba(16,185,129,0.1)", border: "1px solid rgba(16,185,129,0.2)", color: "#10b981", cursor: "pointer" }}>Weekly (Mon)</button>
                                    <button onClick={() => handleSchedule(report.id, "none")} style={{ padding: "4px 10px", fontSize: "11px", borderRadius: "6px", background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.2)", color: "#f87171", cursor: "pointer" }}>Off</button>
                                </div>
                            </div>

                            {report.summary && (
                                <div style={{ background: "rgba(99,102,241,0.06)", border: "1px solid rgba(99,102,241,0.12)", borderRadius: "10px", padding: "12px 14px" }}>
                                    <p style={{ fontSize: "10px", fontWeight: 700, color: "#818cf8", textTransform: "uppercase", letterSpacing: "0.08em", margin: "0 0 6px" }}>Executive Summary</p>
                                    <p style={{ fontSize: "12px", color: "#D1D5DB", lineHeight: 1.6, margin: 0 }}>{report.summary}</p>
                                </div>
                            )}
                            {report.insights.length > 0 && (
                                <div>
                                    <p style={{ fontSize: "10px", fontWeight: 700, color: "#6B7280", textTransform: "uppercase", letterSpacing: "0.08em", margin: "0 0 8px" }}>Insights</p>
                                    <ul style={{ margin: 0, paddingLeft: "16px", display: "flex", flexDirection: "column", gap: "6px" }}>
                                        {report.insights.map((ins, i) => (
                                            <li key={i} style={{ fontSize: "12px", color: "var(--text-secondary)", lineHeight: 1.55 }}>{ins}</li>
                                        ))}
                                    </ul>
                                </div>
                            )}
                            <div>
                                <p style={{ fontSize: "10px", fontWeight: 700, color: "#6B7280", textTransform: "uppercase", letterSpacing: "0.08em", margin: "0 0 8px" }}>SQL</p>
                                <pre style={{ margin: 0, padding: "12px 14px", background: "var(--bg-base)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: "8px", fontSize: "11px", fontFamily: "monospace", color: "#818cf8", overflowX: "auto", whiteSpace: "pre-wrap", lineHeight: 1.7 }}>
                                    {report.sql}
                                </pre>
                            </div>
                        </div>
                    )}
                </div>
            ))}

            {/* Queries list */}
            {!loading && activeTab === "queries" && queries.map(query => (
                <div key={query.id} style={{ background: "#0d0f1a", border: "1px solid var(--border)", borderRadius: "14px", overflow: "hidden", transition: "border-color 0.15s" }}
                    onMouseEnter={e => (e.currentTarget as HTMLElement).style.borderColor = "rgba(99,102,241,0.3)"}
                    onMouseLeave={e => (e.currentTarget as HTMLElement).style.borderColor = "rgba(255,255,255,0.08)"}
                >
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", padding: "18px 20px", gap: "12px" }}>
                        <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap", marginBottom: "8px" }}>
                                <h3 style={{ fontSize: "14px", fontWeight: 700, color: "var(--text-primary)", margin: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{query.title}</h3>
                                {query.tags.map(tag => (
                                    <span key={tag} style={{ fontSize: "10px", fontWeight: 600, color: "#10b981", background: "rgba(16,185,129,0.1)", border: "1px solid rgba(16,185,129,0.2)", borderRadius: "20px", padding: "2px 8px" }}>
                                        {tag}
                                    </span>
                                ))}
                            </div>
                            <pre style={{ margin: 0, padding: "12px 14px", background: "var(--bg-base)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: "8px", fontSize: "11px", fontFamily: "monospace", color: "#818cf8", overflowX: "auto", whiteSpace: "pre-wrap", lineHeight: 1.7 }}>
                                {query.sql}
                            </pre>
                        </div>
                        <div style={{ display: "flex", alignItems: "center", gap: "8px", flexShrink: 0 }}>
                            <span style={{ fontSize: "11px", color: "#374151", whiteSpace: "nowrap" }}>{timeAgo(query.createdAt)}</span>
                            
                            <Link href={`/dashboard/query-studio?sql=${encodeURIComponent(query.sql)}`}
                                style={{ background: "rgba(99,102,241,0.1)", border: "1px solid rgba(99,102,241,0.2)", color: "#818cf8", borderRadius: "7px", padding: "5px 12px", fontSize: "11px", fontWeight: 600, cursor: "pointer", textDecoration: "none", display: "inline-flex", alignItems: "center", gap: "4px" }}
                            >
                                <svg width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M13.5 6H5.25A2.25 2.25 0 003 8.25v10.5A2.25 2.25 0 005.25 21h10.5A2.25 2.25 0 0018 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25" /></svg>
                                Fork
                            </Link>

                            <button
                                onClick={() => handleDelete(query.id, "query")}
                                disabled={deletingId === query.id}
                                style={{ background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.15)", color: "#f87171", borderRadius: "7px", padding: "5px 10px", fontSize: "11px", cursor: deletingId === query.id ? "not-allowed" : "pointer", display: "flex", alignItems: "center", gap: "4px" }}
                            >
                                <svg width="11" height="11" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
                                </svg>
                                {deletingId === query.id ? "…" : "Delete"}
                            </button>
                        </div>
                    </div>
                </div>
            ))}

            <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        </div>
    );
}
