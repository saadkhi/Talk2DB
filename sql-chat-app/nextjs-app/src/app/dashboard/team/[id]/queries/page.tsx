"use client";
import React, { useEffect, useState, use } from "react";
import Link from "next/link";

interface TeamQuery {
    id: string;
    title: string;
    sql: string;
    tags: string[];
    description: string | null;
    createdAt: string;
    author: { id: string; name: string | null; email: string };
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

export default function TeamQueriesPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = use(params);
    const [queries, setQueries] = useState<TeamQuery[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [search, setSearch] = useState("");
    const [forking, setForking] = useState<string | null>(null);
    const [forkMsg, setForkMsg] = useState<string | null>(null);

    // publish form
    const [showPublish, setShowPublish] = useState(false);
    const [publishTitle, setPublishTitle] = useState("");
    const [publishSql, setPublishSql] = useState("");
    const [publishTags, setPublishTags] = useState("");
    const [publishDesc, setPublishDesc] = useState("");
    const [publishing, setPublishing] = useState(false);
    const [publishErr, setPublishErr] = useState<string | null>(null);

    const fetchQueries = async (q?: string) => {
        setLoading(true);
        setError(null);
        const url = q ? `/api/team/${id}/queries?q=${encodeURIComponent(q)}` : `/api/team/${id}/queries`;
        const res = await fetch(url);
        const data = await res.json();
        if (res.ok) setQueries(Array.isArray(data) ? data : []);
        else setError(data.error || "Failed to load queries");
        setLoading(false);
    };

    useEffect(() => { fetchQueries(); }, [id]);

    const handleSearch = (e: React.FormEvent) => {
        e.preventDefault();
        fetchQueries(search);
    };

    const handleFork = async (queryId: string, title: string) => {
        setForking(queryId);
        setForkMsg(null);
        const res = await fetch(`/api/team/${id}/queries/${queryId}`, { method: "POST" });
        const data = await res.json();
        if (res.ok) {
            setForkMsg(`"${title}" forked to your saved queries.`);
            setTimeout(() => setForkMsg(null), 3000);
        } else {
            setForkMsg(`Error: ${data.error}`);
        }
        setForking(null);
    };

    const handlePublish = async (e: React.FormEvent) => {
        e.preventDefault();
        setPublishing(true);
        setPublishErr(null);
        const tags = publishTags.split(",").map((t) => t.trim()).filter(Boolean);
        const res = await fetch(`/api/team/${id}/queries`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ title: publishTitle, sql: publishSql, tags, description: publishDesc }),
        });
        const data = await res.json();
        if (res.ok) {
            setQueries((prev) => [data, ...prev]);
            setShowPublish(false);
            setPublishTitle(""); setPublishSql(""); setPublishTags(""); setPublishDesc("");
        } else {
            setPublishErr(data.error || "Failed to publish");
        }
        setPublishing(false);
    };

    const handleDelete = async (queryId: string) => {
        if (!confirm("Remove this query from the team library?")) return;
        const res = await fetch(`/api/team/${id}/queries/${queryId}`, { method: "DELETE" });
        if (res.ok) setQueries((prev) => prev.filter((q) => q.id !== queryId));
    };

    const inputStyle: React.CSSProperties = {
        background: "var(--bg-base)", border: "1px solid rgba(255,255,255,0.08)",
        borderRadius: "8px", color: "var(--text-primary)", padding: "9px 13px",
        fontSize: "12px", fontFamily: "inherit", outline: "none", transition: "border-color 0.15s",
    };

    return (
        <div style={{ maxWidth: "900px", margin: "0 auto", display: "flex", flexDirection: "column", gap: "20px" }}>
            <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>

            {/* Header */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "12px" }}>
                <div>
                    <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "4px" }}>
                        <Link href={`/dashboard/team/${id}`} style={{ fontSize: "12px", color: "#6B7280", textDecoration: "none" }}>← Team</Link>
                        <span style={{ color: "#374151" }}>/</span>
                        <span style={{ fontSize: "12px", color: "var(--text-primary)", fontWeight: 600 }}>Query Library</span>
                    </div>
                    <h1 style={{ fontSize: "20px", fontWeight: 800, color: "var(--text-primary)", margin: 0, letterSpacing: "-0.03em" }}>Shared Query Library</h1>
                </div>
                <button
                    onClick={() => setShowPublish(true)}
                    style={{ display: "inline-flex", alignItems: "center", gap: "7px", padding: "9px 18px", borderRadius: "9px", fontSize: "12px", fontWeight: 700, background: "linear-gradient(135deg,#6366f1,#8b5cf6)", color: "#fff", border: "none", cursor: "pointer", boxShadow: "0 4px 14px rgba(99,102,241,0.25)" }}
                >
                    <svg width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" /></svg>
                    Publish Query
                </button>
            </div>

            {forkMsg && (
                <div style={{ background: "rgba(16,185,129,0.08)", border: "1px solid rgba(16,185,129,0.2)", borderRadius: "8px", padding: "10px 14px", fontSize: "12px", color: "#34d399" }}>
                    ✓ {forkMsg}
                </div>
            )}

            {/* Publish form */}
            {showPublish && (
                <div style={{ background: "#0d0f1a", border: "1px solid rgba(99,102,241,0.25)", borderRadius: "14px", padding: "20px 24px" }}>
                    <h3 style={{ fontSize: "14px", fontWeight: 700, color: "var(--text-primary)", margin: "0 0 16px" }}>Publish a Query to Team Library</h3>
                    <form onSubmit={handlePublish} style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                        {publishErr && <div style={{ background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.2)", borderRadius: "8px", padding: "9px 12px", fontSize: "12px", color: "#f87171" }}>⚠ {publishErr}</div>}
                        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
                            <div>
                                <label style={{ fontSize: "10px", fontWeight: 700, color: "#6B7280", textTransform: "uppercase", letterSpacing: "0.08em", display: "block", marginBottom: "5px" }}>Title *</label>
                                <input value={publishTitle} onChange={(e) => setPublishTitle(e.target.value)} required placeholder="Monthly active users" style={{ ...inputStyle, width: "100%", boxSizing: "border-box" }} onFocus={(e) => (e.currentTarget.style.borderColor = "#6366f1")} onBlur={(e) => (e.currentTarget.style.borderColor = "rgba(255,255,255,0.08)")} />
                            </div>
                            <div>
                                <label style={{ fontSize: "10px", fontWeight: 700, color: "#6B7280", textTransform: "uppercase", letterSpacing: "0.08em", display: "block", marginBottom: "5px" }}>Tags (comma-separated)</label>
                                <input value={publishTags} onChange={(e) => setPublishTags(e.target.value)} placeholder="analytics, users" style={{ ...inputStyle, width: "100%", boxSizing: "border-box" }} onFocus={(e) => (e.currentTarget.style.borderColor = "#6366f1")} onBlur={(e) => (e.currentTarget.style.borderColor = "rgba(255,255,255,0.08)")} />
                            </div>
                        </div>
                        <div>
                            <label style={{ fontSize: "10px", fontWeight: 700, color: "#6B7280", textTransform: "uppercase", letterSpacing: "0.08em", display: "block", marginBottom: "5px" }}>SQL *</label>
                            <textarea value={publishSql} onChange={(e) => setPublishSql(e.target.value)} required placeholder="SELECT ..." rows={4} style={{ ...inputStyle, width: "100%", boxSizing: "border-box", resize: "vertical", fontFamily: "monospace", lineHeight: 1.6 }} onFocus={(e) => (e.currentTarget.style.borderColor = "#6366f1")} onBlur={(e) => (e.currentTarget.style.borderColor = "rgba(255,255,255,0.08)")} />
                        </div>
                        <div>
                            <label style={{ fontSize: "10px", fontWeight: 700, color: "#6B7280", textTransform: "uppercase", letterSpacing: "0.08em", display: "block", marginBottom: "5px" }}>Description (optional)</label>
                            <input value={publishDesc} onChange={(e) => setPublishDesc(e.target.value)} placeholder="What does this query do?" style={{ ...inputStyle, width: "100%", boxSizing: "border-box" }} onFocus={(e) => (e.currentTarget.style.borderColor = "#6366f1")} onBlur={(e) => (e.currentTarget.style.borderColor = "rgba(255,255,255,0.08)")} />
                        </div>
                        <div style={{ display: "flex", gap: "8px", justifyContent: "flex-end" }}>
                            <button type="button" onClick={() => setShowPublish(false)} style={{ padding: "8px 18px", borderRadius: "8px", fontSize: "12px", background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.1)", color: "#9CA3AF", cursor: "pointer" }}>Cancel</button>
                            <button type="submit" disabled={publishing} style={{ padding: "8px 18px", borderRadius: "8px", fontSize: "12px", fontWeight: 700, background: "linear-gradient(135deg,#6366f1,#8b5cf6)", border: "none", color: "#fff", cursor: publishing ? "not-allowed" : "pointer", display: "flex", alignItems: "center", gap: "6px" }}>
                                {publishing && <div style={{ width: "11px", height: "11px", border: "2px solid rgba(255,255,255,0.3)", borderTop: "2px solid #fff", borderRadius: "50%", animation: "spin 0.7s linear infinite" }} />}
                                {publishing ? "Publishing…" : "Publish"}
                            </button>
                        </div>
                    </form>
                </div>
            )}

            {/* Search */}
            <form onSubmit={handleSearch} style={{ display: "flex", gap: "8px" }}>
                <input
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Search queries by title, SQL, or description…"
                    style={{ ...inputStyle, flex: 1 }}
                    onFocus={(e) => (e.currentTarget.style.borderColor = "#6366f1")}
                    onBlur={(e) => (e.currentTarget.style.borderColor = "rgba(255,255,255,0.08)")}
                />
                <button type="submit" style={{ padding: "9px 16px", borderRadius: "8px", fontSize: "12px", fontWeight: 600, background: "rgba(99,102,241,0.12)", border: "1px solid rgba(99,102,241,0.25)", color: "#818cf8", cursor: "pointer" }}>Search</button>
                {search && <button type="button" onClick={() => { setSearch(""); fetchQueries(); }} style={{ padding: "9px 12px", borderRadius: "8px", fontSize: "12px", background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.1)", color: "#6B7280", cursor: "pointer" }}>Clear</button>}
            </form>

            {loading && (
                <div style={{ display: "flex", alignItems: "center", gap: "10px", justifyContent: "center", padding: "48px 0", color: "#6B7280", fontSize: "13px" }}>
                    <div style={{ width: "16px", height: "16px", border: "2px solid rgba(99,102,241,0.2)", borderTop: "2px solid #6366f1", borderRadius: "50%", animation: "spin 0.7s linear infinite" }} />
                    Loading queries…
                </div>
            )}

            {error && <div style={{ background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.2)", borderRadius: "10px", padding: "14px 16px", fontSize: "12px", color: "#f87171" }}>⚠ {error}</div>}

            {!loading && !error && queries.length === 0 && (
                <div style={{ background: "#0d0f1a", border: "1px solid rgba(255,255,255,0.07)", borderRadius: "14px", padding: "48px 24px", textAlign: "center" }}>
                    <p style={{ fontSize: "14px", fontWeight: 700, color: "var(--text-primary)", margin: "0 0 6px" }}>No queries shared yet</p>
                    <p style={{ fontSize: "12px", color: "#6B7280", margin: 0 }}>Publish a query above to share it with your team.</p>
                </div>
            )}

            {!loading && queries.map((q) => (
                <div key={q.id} style={{ background: "#0d0f1a", border: "1px solid rgba(255,255,255,0.07)", borderRadius: "14px", overflow: "hidden" }}>
                    <div style={{ padding: "16px 20px", display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "12px" }}>
                        <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap", marginBottom: "6px" }}>
                                <h3 style={{ fontSize: "14px", fontWeight: 700, color: "var(--text-primary)", margin: 0 }}>{q.title}</h3>
                                {q.tags.map((tag) => (
                                    <span key={tag} style={{ fontSize: "10px", fontWeight: 600, color: "#10b981", background: "rgba(16,185,129,0.1)", border: "1px solid rgba(16,185,129,0.2)", borderRadius: "20px", padding: "1px 8px" }}>{tag}</span>
                                ))}
                            </div>
                            {q.description && <p style={{ fontSize: "12px", color: "#9CA3AF", margin: "0 0 8px", lineHeight: 1.5 }}>{q.description}</p>}
                            <pre style={{ margin: 0, padding: "10px 14px", background: "var(--bg-base)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: "8px", fontSize: "11px", fontFamily: "monospace", color: "#818cf8", overflowX: "auto", whiteSpace: "pre-wrap", lineHeight: 1.7 }}>{q.sql}</pre>
                        </div>
                        <div style={{ display: "flex", flexDirection: "column", gap: "6px", flexShrink: 0, alignItems: "flex-end" }}>
                            <span style={{ fontSize: "10px", color: "#4B5563" }}>{timeAgo(q.createdAt)}</span>
                            <span style={{ fontSize: "10px", color: "#6B7280" }}>by {q.author.name || q.author.email}</span>
                            <Link
                                href={`/dashboard/query-studio?sql=${encodeURIComponent(q.sql)}`}
                                style={{ padding: "5px 12px", borderRadius: "7px", fontSize: "11px", fontWeight: 600, background: "rgba(99,102,241,0.1)", border: "1px solid rgba(99,102,241,0.2)", color: "#818cf8", textDecoration: "none", display: "inline-flex", alignItems: "center", gap: "4px" }}
                            >
                                Open in Studio
                            </Link>
                            <button
                                onClick={() => handleFork(q.id, q.title)}
                                disabled={forking === q.id}
                                style={{ padding: "5px 12px", borderRadius: "7px", fontSize: "11px", fontWeight: 600, background: "rgba(16,185,129,0.08)", border: "1px solid rgba(16,185,129,0.2)", color: "#34d399", cursor: forking === q.id ? "not-allowed" : "pointer", display: "flex", alignItems: "center", gap: "4px" }}
                            >
                                {forking === q.id ? "Forking…" : "Fork to Mine"}
                            </button>
                            <button
                                onClick={() => handleDelete(q.id)}
                                style={{ padding: "5px 10px", borderRadius: "7px", fontSize: "11px", background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.15)", color: "#f87171", cursor: "pointer" }}
                            >
                                Remove
                            </button>
                        </div>
                    </div>
                </div>
            ))}
        </div>
    );
}
