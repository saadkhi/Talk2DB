"use client";
import React, { useEffect, useState, use } from "react";
import Link from "next/link";

interface DashboardItem {
    id: string;
    title: string;
    type: string;
    sql: string;
    config: string | null;
    pinned: boolean;
    createdAt: string;
    author: { id: string; name: string | null; email: string };
}

function timeAgo(iso: string) {
    const diff = Date.now() - new Date(iso).getTime();
    const d = Math.floor(diff / 86400000);
    if (d < 1) return "today";
    if (d === 1) return "yesterday";
    if (d < 30) return `${d}d ago`;
    return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

const TYPE_COLORS: Record<string, string> = { chart: "#6366f1", metric: "#f59e0b", table: "#3b82f6" };

export default function TeamDashboardPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = use(params);
    const [items, setItems] = useState<DashboardItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // pin form
    const [showPin, setShowPin] = useState(false);
    const [pinTitle, setPinTitle] = useState("");
    const [pinSql, setPinSql] = useState("");
    const [pinType, setPinType] = useState("table");
    const [pinning, setPinning] = useState(false);
    const [pinErr, setPinErr] = useState<string | null>(null);

    const fetchItems = async () => {
        setLoading(true);
        const res = await fetch(`/api/team/${id}/dashboard`);
        const data = await res.json();
        if (res.ok) setItems(Array.isArray(data) ? data : []);
        else setError(data.error || "Failed to load dashboard");
        setLoading(false);
    };

    useEffect(() => { fetchItems(); }, [id]);

    const handlePin = async (e: React.FormEvent) => {
        e.preventDefault();
        setPinning(true);
        setPinErr(null);
        const res = await fetch(`/api/team/${id}/dashboard`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ title: pinTitle, sql: pinSql, type: pinType }),
        });
        const data = await res.json();
        if (res.ok) {
            setItems((prev) => [...prev, data]);
            setShowPin(false);
            setPinTitle(""); setPinSql(""); setPinType("table");
        } else {
            setPinErr(data.error || "Failed to pin");
        }
        setPinning(false);
    };

    const handleUnpin = async (itemId: string) => {
        if (!confirm("Remove this item from the team dashboard?")) return;
        const res = await fetch(`/api/team/${id}/dashboard/${itemId}`, { method: "DELETE" });
        if (res.ok) setItems((prev) => prev.filter((i) => i.id !== itemId));
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
                        <span style={{ fontSize: "12px", color: "var(--text-primary)", fontWeight: 600 }}>Shared Dashboard</span>
                    </div>
                    <h1 style={{ fontSize: "20px", fontWeight: 800, color: "var(--text-primary)", margin: 0, letterSpacing: "-0.03em" }}>Team Dashboard</h1>
                    <p style={{ fontSize: "13px", color: "#6B7280", margin: "4px 0 0" }}>Pinned charts, metrics, and tables visible to everyone on this team.</p>
                </div>
                <button
                    onClick={() => setShowPin(true)}
                    style={{ display: "inline-flex", alignItems: "center", gap: "7px", padding: "9px 18px", borderRadius: "9px", fontSize: "12px", fontWeight: 700, background: "linear-gradient(135deg,#6366f1,#8b5cf6)", color: "#fff", border: "none", cursor: "pointer", boxShadow: "0 4px 14px rgba(99,102,241,0.25)" }}
                >
                    <svg width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" /></svg>
                    Pin Item
                </button>
            </div>

            {/* Pin form */}
            {showPin && (
                <div style={{ background: "#0d0f1a", border: "1px solid rgba(99,102,241,0.25)", borderRadius: "14px", padding: "20px 24px" }}>
                    <h3 style={{ fontSize: "14px", fontWeight: 700, color: "var(--text-primary)", margin: "0 0 16px" }}>Pin a new item to the team dashboard</h3>
                    <form onSubmit={handlePin} style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                        {pinErr && <div style={{ background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.2)", borderRadius: "8px", padding: "9px 12px", fontSize: "12px", color: "#f87171" }}>⚠ {pinErr}</div>}
                        <div style={{ display: "grid", gridTemplateColumns: "1fr 180px", gap: "10px" }}>
                            <div>
                                <label style={{ fontSize: "10px", fontWeight: 700, color: "#6B7280", textTransform: "uppercase", letterSpacing: "0.08em", display: "block", marginBottom: "5px" }}>Title *</label>
                                <input value={pinTitle} onChange={(e) => setPinTitle(e.target.value)} required placeholder="Monthly Revenue" style={{ ...inputStyle, width: "100%", boxSizing: "border-box" }} onFocus={(e) => (e.currentTarget.style.borderColor = "#6366f1")} onBlur={(e) => (e.currentTarget.style.borderColor = "rgba(255,255,255,0.08)")} />
                            </div>
                            <div>
                                <label style={{ fontSize: "10px", fontWeight: 700, color: "#6B7280", textTransform: "uppercase", letterSpacing: "0.08em", display: "block", marginBottom: "5px" }}>Type</label>
                                <select value={pinType} onChange={(e) => setPinType(e.target.value)} style={{ ...inputStyle, width: "100%", boxSizing: "border-box" }}>
                                    <option value="table">Table</option>
                                    <option value="metric">Metric</option>
                                    <option value="chart">Chart</option>
                                </select>
                            </div>
                        </div>
                        <div>
                            <label style={{ fontSize: "10px", fontWeight: 700, color: "#6B7280", textTransform: "uppercase", letterSpacing: "0.08em", display: "block", marginBottom: "5px" }}>SQL *</label>
                            <textarea value={pinSql} onChange={(e) => setPinSql(e.target.value)} required placeholder="SELECT ..." rows={4} style={{ ...inputStyle, width: "100%", boxSizing: "border-box", resize: "vertical", fontFamily: "monospace", lineHeight: 1.6 }} onFocus={(e) => (e.currentTarget.style.borderColor = "#6366f1")} onBlur={(e) => (e.currentTarget.style.borderColor = "rgba(255,255,255,0.08)")} />
                        </div>
                        <div style={{ display: "flex", gap: "8px", justifyContent: "flex-end" }}>
                            <button type="button" onClick={() => setShowPin(false)} style={{ padding: "8px 18px", borderRadius: "8px", fontSize: "12px", background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.1)", color: "#9CA3AF", cursor: "pointer" }}>Cancel</button>
                            <button type="submit" disabled={pinning} style={{ padding: "8px 18px", borderRadius: "8px", fontSize: "12px", fontWeight: 700, background: "linear-gradient(135deg,#6366f1,#8b5cf6)", border: "none", color: "#fff", cursor: pinning ? "not-allowed" : "pointer", display: "flex", alignItems: "center", gap: "6px" }}>
                                {pinning && <div style={{ width: "11px", height: "11px", border: "2px solid rgba(255,255,255,0.3)", borderTop: "2px solid #fff", borderRadius: "50%", animation: "spin 0.7s linear infinite" }} />}
                                {pinning ? "Pinning…" : "Pin to Dashboard"}
                            </button>
                        </div>
                    </form>
                </div>
            )}

            {loading && (
                <div style={{ display: "flex", alignItems: "center", gap: "10px", justifyContent: "center", padding: "48px 0", color: "#6B7280", fontSize: "13px" }}>
                    <div style={{ width: "16px", height: "16px", border: "2px solid rgba(99,102,241,0.2)", borderTop: "2px solid #6366f1", borderRadius: "50%", animation: "spin 0.7s linear infinite" }} />
                    Loading dashboard…
                </div>
            )}

            {error && <div style={{ background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.2)", borderRadius: "10px", padding: "14px 16px", fontSize: "12px", color: "#f87171" }}>⚠ {error}</div>}

            {!loading && !error && items.length === 0 && (
                <div style={{ background: "#0d0f1a", border: "1px solid rgba(255,255,255,0.07)", borderRadius: "14px", padding: "60px 24px", textAlign: "center" }}>
                    <div style={{ width: "52px", height: "52px", borderRadius: "14px", background: "rgba(99,102,241,0.1)", border: "1px solid rgba(99,102,241,0.15)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 14px" }}>
                        <svg width="24" height="24" fill="none" stroke="#6366f1" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M7.5 14.25v2.25m3-4.5v4.5m3-6.75v6.75m3-9v9M6 20.25h12A2.25 2.25 0 0020.25 18V6A2.25 2.25 0 0018 3.75H6A2.25 2.25 0 003.75 6v12A2.25 2.25 0 006 20.25z" /></svg>
                    </div>
                    <p style={{ fontSize: "14px", fontWeight: 700, color: "var(--text-primary)", margin: "0 0 6px" }}>Dashboard is empty</p>
                    <p style={{ fontSize: "12px", color: "#6B7280", margin: 0 }}>Pin queries and charts here for your team to see at a glance.</p>
                </div>
            )}

            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(380px, 1fr))", gap: "16px" }}>
                {!loading && items.map((item) => {
                    const color = TYPE_COLORS[item.type] ?? "#6B7280";
                    return (
                        <div key={item.id} style={{ background: "#0d0f1a", border: "1px solid rgba(255,255,255,0.07)", borderRadius: "14px", padding: "18px 20px", display: "flex", flexDirection: "column", gap: "12px" }}>
                            <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: "10px" }}>
                                <div>
                                    <h3 style={{ fontSize: "14px", fontWeight: 700, color: "var(--text-primary)", margin: "0 0 4px" }}>{item.title}</h3>
                                    <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
                                        <span style={{ fontSize: "10px", fontWeight: 700, textTransform: "uppercase", color, background: `${color}18`, border: `1px solid ${color}30`, borderRadius: "20px", padding: "1px 8px" }}>{item.type}</span>
                                        <span style={{ fontSize: "10px", color: "#4B5563" }}>by {item.author.name || item.author.email} · {timeAgo(item.createdAt)}</span>
                                    </div>
                                </div>
                                <div style={{ display: "flex", gap: "6px" }}>
                                    <Link
                                        href={`/dashboard/query-studio?sql=${encodeURIComponent(item.sql)}`}
                                        style={{ padding: "5px 10px", borderRadius: "7px", fontSize: "11px", fontWeight: 600, background: "rgba(99,102,241,0.1)", border: "1px solid rgba(99,102,241,0.2)", color: "#818cf8", textDecoration: "none" }}
                                    >
                                        Open
                                    </Link>
                                    <button
                                        onClick={() => handleUnpin(item.id)}
                                        style={{ padding: "5px 8px", borderRadius: "7px", fontSize: "11px", background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.15)", color: "#f87171", cursor: "pointer" }}
                                    >
                                        <svg width="11" height="11" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
                                    </button>
                                </div>
                            </div>
                            <pre style={{ margin: 0, padding: "10px 14px", background: "var(--bg-base)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: "8px", fontSize: "11px", fontFamily: "monospace", color: "#818cf8", overflowX: "auto", whiteSpace: "pre-wrap", lineHeight: 1.7, display: "-webkit-box", WebkitLineClamp: 4, WebkitBoxOrient: "vertical", overflow: "hidden" }}>
                                {item.sql}
                            </pre>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
