"use client";
import React, { useEffect, useState, useCallback } from "react";
import { useSession, signOut } from "next-auth/react";
import { useRouter } from "next/navigation";

/* ── Types ───────────────────────────────────────────────── */
interface AdminStats {
    totalUsers: number;
    totalConversations: number;
    totalMessages: number;
    totalReports: number;
    usersWithDb: number;
    dbConnectionRate: number;
}
interface UserRow {
    id: string;
    name: string | null;
    email: string;
    dbConnected: boolean;
    dbDialect: string | null;
    conversationCount: number;
    messageCount: number;
    savedReportCount: number;
    lastActive: string;
    lastConversationTitle: string | null;
    joinedAt: string;
}
interface ActivityPoint { day: string; count: number; }
interface AdminData {
    stats: AdminStats;
    users: UserRow[];
    activityChart: ActivityPoint[];
}

const ADMIN_EMAIL = process.env.NEXT_PUBLIC_ADMIN_EMAIL ?? "";

/* ── Helpers ─────────────────────────────────────────────── */
function timeAgo(iso: string) {
    const diff = Date.now() - new Date(iso).getTime();
    const m = Math.floor(diff / 60000);
    if (m < 1) return "just now";
    if (m < 60) return `${m}m ago`;
    const h = Math.floor(m / 60);
    if (h < 24) return `${h}h ago`;
    return `${Math.floor(h / 24)}d ago`;
}
function fmtDate(iso: string) {
    return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

/* ── StatCard ────────────────────────────────────────────── */
function StatCard({ label, value, sub, color, icon }: {
    label: string; value: string | number; sub?: string; color: string; icon: React.ReactNode;
}) {
    return (
        <div style={{
            background: "#0d0f1a", border: "1px solid rgba(255,255,255,0.07)",
            borderRadius: "14px", padding: "20px 22px", display: "flex",
            alignItems: "flex-start", gap: "14px", flex: "1 1 160px",
        }}>
            <div style={{
                width: "38px", height: "38px", borderRadius: "10px", flexShrink: 0,
                background: `${color}18`, color, display: "flex", alignItems: "center", justifyContent: "center",
            }}>{icon}</div>
            <div>
                <p style={{ fontSize: "11px", color: "#6B7280", textTransform: "uppercase", letterSpacing: "0.08em", margin: "0 0 4px" }}>{label}</p>
                <p style={{ fontSize: "24px", fontWeight: 800, color: "#fff", margin: 0, lineHeight: 1 }}>{value}</p>
                {sub && <p style={{ fontSize: "11px", color: "#4B5563", margin: "4px 0 0" }}>{sub}</p>}
            </div>
        </div>
    );
}

/* ── ActivityBar chart (pure CSS/SVG) ───────────────────── */
function ActivityChart({ data }: { data: ActivityPoint[] }) {
    const maxCount = Math.max(...data.map(d => d.count), 1);
    return (
        <div style={{ display: "flex", alignItems: "flex-end", gap: "6px", height: "60px" }}>
            {data.length === 0 && (
                <span style={{ fontSize: "11px", color: "#374151", alignSelf: "center" }}>No activity in last 7 days</span>
            )}
            {data.map((d) => (
                <div key={d.day} title={`${d.day}: ${d.count} messages`}
                    style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "4px", flex: 1 }}>
                    <div style={{
                        width: "100%", minHeight: "4px",
                        height: `${Math.max(4, (d.count / maxCount) * 52)}px`,
                        borderRadius: "4px 4px 0 0",
                        background: "linear-gradient(to top, #6366f1, #8b5cf6)",
                        transition: "height 0.3s ease",
                    }} />
                    <span style={{ fontSize: "9px", color: "#374151", whiteSpace: "nowrap" }}>
                        {new Date(d.day).toLocaleDateString("en-US", { weekday: "short" })}
                    </span>
                </div>
            ))}
        </div>
    );
}

/* ── Main page ───────────────────────────────────────────── */
export default function AdminPage() {
    const { data: session, status } = useSession();
    const router = useRouter();
    const [data, setData] = useState<AdminData | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [search, setSearch] = useState("");
    const [deletingId, setDeletingId] = useState<string | null>(null);
    const [confirmDelete, setConfirmDelete] = useState<UserRow | null>(null);
    const [lastRefresh, setLastRefresh] = useState<Date>(new Date());

    const fetchData = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const res = await fetch("/api/admin/stats");
            if (res.status === 403) { setError("forbidden"); setLoading(false); return; }
            if (!res.ok) throw new Error("Failed to fetch admin data");
            setData(await res.json());
            setLastRefresh(new Date());
        } catch (e: any) {
            setError(e.message);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        if (status === "unauthenticated") { router.push("/auth/login"); return; }
        if (status === "authenticated") fetchData();
    }, [status, fetchData, router]);

    async function handleDelete(user: UserRow) {
        setDeletingId(user.id);
        try {
            const res = await fetch(`/api/admin/users/${user.id}`, { method: "DELETE" });
            if (!res.ok) { const d = await res.json(); alert(d.error || "Delete failed"); }
            else fetchData();
        } finally {
            setDeletingId(null);
            setConfirmDelete(null);
        }
    }

    const email = (session?.user as any)?.email;

    /* ── Guard states ──── */
    if (status === "loading" || loading) return <LoadingScreen />;
    // Let the API be the single source of truth for admin access.
    // A 403 from the API sets error="forbidden" which shows ForbiddenScreen.
    if (error === "forbidden") return <ForbiddenScreen />;
    if (error) return <ErrorScreen message={error} onRetry={fetchData} />;
    if (!data) return null;

    const filtered = data.users.filter(u =>
        u.email.toLowerCase().includes(search.toLowerCase()) ||
        (u.name ?? "").toLowerCase().includes(search.toLowerCase())
    );

    const c = containerStyle;

    return (
        <div style={{ minHeight: "100vh", background: "#080a12", color: "#fff" }}>
            {/* ── Top bar ── */}
            <div style={{
                display: "flex", alignItems: "center", justifyContent: "space-between",
                padding: "0 28px", height: "56px",
                background: "rgba(13,15,26,0.95)", borderBottom: "1px solid rgba(255,255,255,0.06)",
                position: "sticky", top: 0, zIndex: 50, backdropFilter: "blur(12px)",
            }}>
                <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                    <div style={{ width: "28px", height: "28px", borderRadius: "8px", background: "linear-gradient(135deg,#6366f1,#8b5cf6)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                        <svg width="15" height="15" fill="none" stroke="white" strokeWidth="2" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
                        </svg>
                    </div>
                    <span style={{ fontWeight: 700, fontSize: "15px" }}>Talk2DB Admin</span>
                    <span style={{ fontSize: "10px", color: "#6B7280", background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: "20px", padding: "2px 10px", fontWeight: 600 }}>RESTRICTED</span>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                    <span style={{ fontSize: "11px", color: "#4B5563" }}>Last refresh: {lastRefresh.toLocaleTimeString()}</span>
                    <button onClick={fetchData} style={{ background: "rgba(99,102,241,0.1)", border: "1px solid rgba(99,102,241,0.2)", color: "#818cf8", borderRadius: "8px", padding: "6px 14px", fontSize: "12px", fontWeight: 600, cursor: "pointer", display: "flex", alignItems: "center", gap: "6px" }}>
                        <svg width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99" /></svg>
                        Refresh
                    </button>
                    <button onClick={() => router.push("/dashboard")} style={{ background: "none", border: "1px solid rgba(255,255,255,0.08)", color: "#9CA3AF", borderRadius: "8px", padding: "6px 14px", fontSize: "12px", cursor: "pointer" }}>← Dashboard</button>
                    <button onClick={() => signOut({ callbackUrl: "/auth/login" })} style={{ background: "none", border: "1px solid rgba(239,68,68,0.2)", color: "#f87171", borderRadius: "8px", padding: "6px 14px", fontSize: "12px", cursor: "pointer" }}>Sign out</button>
                </div>
            </div>

            {/* ── Main content ── */}
            <div style={{ maxWidth: "1300px", margin: "0 auto", padding: "32px 28px", display: "flex", flexDirection: "column", gap: "28px" }}>

                {/* Section title */}
                <div>
                    <h1 style={{ fontSize: "22px", fontWeight: 800, margin: "0 0 4px", letterSpacing: "-0.03em" }}>Admin Overview</h1>
                    <p style={{ fontSize: "13px", color: "#4B5563", margin: 0 }}>Signed in as <span style={{ color: "#818cf8" }}>{email}</span></p>
                </div>

                {/* ── Stat cards ── */}
                <div style={{ display: "flex", gap: "14px", flexWrap: "wrap" }}>
                    <StatCard label="Total Users" value={data.stats.totalUsers} color="#6366f1"
                        icon={<svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z" /></svg>}
                    />
                    <StatCard label="Conversations" value={data.stats.totalConversations} color="#3b82f6"
                        icon={<svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M20.25 8.511c.884.284 1.5 1.128 1.5 2.097v4.286c0 1.136-.847 2.1-1.98 2.193-.34.027-.68.052-1.02.072v3.091l-3-3c-1.354 0-2.694-.055-4.02-.163a2.115 2.115 0 01-.825-.242m9.345-8.334a2.126 2.126 0 00-.476-.095 48.64 48.64 0 00-8.048 0c-1.131.094-1.976 1.057-1.976 2.192v4.286c0 .837.46 1.58 1.155 1.951m9.345-8.334V6.637c0-1.621-1.152-3.026-2.76-3.235A48.455 48.455 0 0011.25 3c-2.115 0-4.198.137-6.24.402-1.608.209-2.76 1.614-2.76 3.235v6.226c0 1.621 1.152 3.026 2.76 3.235.577.075 1.157.14 1.74.194V21l4.155-4.155" /></svg>}
                    />
                    <StatCard label="Messages Sent" value={data.stats.totalMessages} color="#10b981"
                        icon={<svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M7.5 8.25h9m-9 3H12m-9.75 1.51c0 1.6 1.123 2.994 2.707 3.227 1.129.166 2.27.293 3.423.379.35.026.67.21.865.501L12 21l2.755-4.133a1.14 1.14 0 01.865-.501 48.172 48.172 0 003.423-.379c1.584-.233 2.707-1.626 2.707-3.228V6.741c0-1.602-1.123-2.995-2.707-3.228A48.394 48.394 0 0012 3c-2.392 0-4.744.175-7.043.513C3.373 3.746 2.25 5.14 2.25 6.741v6.018z" /></svg>}
                    />
                    <StatCard label="Saved Reports" value={data.stats.totalReports} color="#f59e0b"
                        icon={<svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" /></svg>}
                    />
                    <StatCard label="DB Connected" value={`${data.stats.usersWithDb}/${data.stats.totalUsers}`} sub={`${data.stats.dbConnectionRate}% connection rate`} color="#8b5cf6"
                        icon={<svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M20.25 6.375c0 2.278-3.694 4.125-8.25 4.125S3.75 8.653 3.75 6.375m16.5 0c0-2.278-3.694-4.125-8.25-4.125S3.75 4.097 3.75 6.375m16.5 0v11.25c0 2.278-3.694 4.125-8.25 4.125s-8.25-1.847-8.25-4.125V6.375m16.5 2.625c0 2.278-3.694 4.125-8.25 4.125s-8.25-1.847-8.25-4.125" /></svg>}
                    />
                </div>

                {/* ── Activity chart + app health ── */}
                <div style={{ display: "flex", gap: "14px", flexWrap: "wrap" }}>
                    <div style={{ flex: "2 1 320px", background: "#0d0f1a", border: "1px solid rgba(255,255,255,0.07)", borderRadius: "14px", padding: "22px 24px" }}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
                            <div>
                                <p style={{ fontSize: "13px", fontWeight: 700, color: "#fff", margin: 0 }}>Message Activity</p>
                                <p style={{ fontSize: "11px", color: "#4B5563", margin: "2px 0 0" }}>Last 7 days</p>
                            </div>
                            <span style={{ fontSize: "11px", color: "#6366f1", background: "rgba(99,102,241,0.1)", border: "1px solid rgba(99,102,241,0.15)", padding: "3px 10px", borderRadius: "20px", fontWeight: 600 }}>
                                {data.activityChart.reduce((s, d) => s + d.count, 0)} total
                            </span>
                        </div>
                        <ActivityChart data={data.activityChart} />
                    </div>

                    <div style={{ flex: "1 1 200px", background: "#0d0f1a", border: "1px solid rgba(255,255,255,0.07)", borderRadius: "14px", padding: "22px 24px" }}>
                        <p style={{ fontSize: "13px", fontWeight: 700, color: "#fff", margin: "0 0 16px" }}>App Health</p>
                        {[
                            { label: "API Server", status: "Operational", color: "#10b981" },
                            { label: "Database", status: "Operational", color: "#10b981" },
                            { label: "Auth Service", status: "Operational", color: "#10b981" },
                            { label: "AI Models", status: "External", color: "#f59e0b" },
                        ].map(s => (
                            <div key={s.label} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 0", borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
                                <span style={{ fontSize: "12px", color: "#9CA3AF" }}>{s.label}</span>
                                <span style={{ display: "flex", alignItems: "center", gap: "5px", fontSize: "11px", color: s.color, fontWeight: 600 }}>
                                    <span style={{ width: "6px", height: "6px", borderRadius: "50%", background: s.color, display: "inline-block", boxShadow: `0 0 5px ${s.color}` }} />
                                    {s.status}
                                </span>
                            </div>
                        ))}
                    </div>
                </div>

                {/* ── Users table ── */}
                <div style={{ background: "#0d0f1a", border: "1px solid rgba(255,255,255,0.07)", borderRadius: "14px", overflow: "hidden" }}>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "18px 22px", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
                        <div>
                            <p style={{ fontSize: "14px", fontWeight: 700, color: "#fff", margin: 0 }}>Users <span style={{ fontSize: "12px", color: "#4B5563", fontWeight: 400 }}>({filtered.length})</span></p>
                        </div>
                        <input value={search} onChange={e => setSearch(e.target.value)}
                            placeholder="Search by name or email..."
                            style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: "8px", padding: "7px 14px", fontSize: "12px", color: "#fff", width: "240px", outline: "none" }}
                        />
                    </div>
                    <div style={{ overflowX: "auto" }}>
                        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "12px" }}>
                            <thead>
                                <tr style={{ background: "rgba(255,255,255,0.02)" }}>
                                    {["User", "Status", "DB", "Conversations", "Messages", "Reports", "Last Active", "Joined", "Actions"].map(h => (
                                        <th key={h} style={{ padding: "10px 16px", textAlign: "left", color: "#4B5563", fontWeight: 600, fontSize: "10px", textTransform: "uppercase", letterSpacing: "0.07em", whiteSpace: "nowrap" }}>{h}</th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                {filtered.map((u) => (
                                    <tr key={u.id} style={{ borderTop: "1px solid rgba(255,255,255,0.04)" }}
                                        onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = "rgba(255,255,255,0.02)"}
                                        onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = "transparent"}
                                    >
                                        <td style={{ padding: "12px 16px" }}>
                                            <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                                                <div style={{ width: "30px", height: "30px", borderRadius: "50%", background: "linear-gradient(135deg,#6366f1,#8b5cf6)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "11px", fontWeight: 700, flexShrink: 0 }}>
                                                    {(u.name ?? u.email).slice(0, 2).toUpperCase()}
                                                </div>
                                                <div>
                                                    <p style={{ margin: 0, fontWeight: 600, color: "#fff", fontSize: "12px" }}>{u.name ?? "—"}</p>
                                                    <p style={{ margin: 0, color: "#6B7280", fontSize: "11px" }}>{u.email}</p>
                                                </div>
                                            </div>
                                        </td>
                                        <td style={{ padding: "12px 16px" }}>
                                            <span style={{ display: "inline-flex", alignItems: "center", gap: "5px", fontSize: "10px", fontWeight: 700, color: u.email === ADMIN_EMAIL ? "#f59e0b" : "#34d399", background: u.email === ADMIN_EMAIL ? "rgba(245,158,11,0.1)" : "rgba(16,185,129,0.08)", border: `1px solid ${u.email === ADMIN_EMAIL ? "rgba(245,158,11,0.2)" : "rgba(16,185,129,0.15)"}`, borderRadius: "20px", padding: "2px 8px" }}>
                                                <span style={{ width: "5px", height: "5px", borderRadius: "50%", background: u.email === ADMIN_EMAIL ? "#f59e0b" : "#10b981", display: "inline-block" }} />
                                                {u.email === ADMIN_EMAIL ? "Admin" : "User"}
                                            </span>
                                        </td>
                                        <td style={{ padding: "12px 16px" }}>
                                            <span style={{ fontSize: "10px", fontWeight: 600, color: u.dbConnected ? "#34d399" : "#6B7280", background: u.dbConnected ? "rgba(16,185,129,0.08)" : "rgba(255,255,255,0.03)", border: `1px solid ${u.dbConnected ? "rgba(16,185,129,0.15)" : "rgba(255,255,255,0.06)"}`, borderRadius: "20px", padding: "2px 8px" }}>
                                                {u.dbConnected ? (u.dbDialect ?? "PG") : "None"}
                                            </span>
                                        </td>
                                        <td style={{ padding: "12px 16px", color: "#9CA3AF", textAlign: "center" }}>{u.conversationCount}</td>
                                        <td style={{ padding: "12px 16px", color: "#9CA3AF", textAlign: "center" }}>{u.messageCount}</td>
                                        <td style={{ padding: "12px 16px", color: "#9CA3AF", textAlign: "center" }}>{u.savedReportCount}</td>
                                        <td style={{ padding: "12px 16px", color: "#6B7280", whiteSpace: "nowrap" }}>
                                            <span title={new Date(u.lastActive).toLocaleString()}>{timeAgo(u.lastActive)}</span>
                                            {u.lastConversationTitle && <p style={{ margin: "2px 0 0", fontSize: "10px", color: "#374151", maxWidth: "140px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{u.lastConversationTitle}</p>}
                                        </td>
                                        <td style={{ padding: "12px 16px", color: "#6B7280", whiteSpace: "nowrap" }}>{fmtDate(u.joinedAt)}</td>
                                        <td style={{ padding: "12px 16px" }}>
                                            {u.email !== ADMIN_EMAIL && (
                                                <button onClick={() => setConfirmDelete(u)} disabled={deletingId === u.id}
                                                    style={{ background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.15)", color: "#f87171", borderRadius: "7px", padding: "5px 12px", fontSize: "11px", fontWeight: 600, cursor: "pointer", display: "flex", alignItems: "center", gap: "5px" }}>
                                                    <svg width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" /></svg>
                                                    Delete
                                                </button>
                                            )}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                        {filtered.length === 0 && (
                            <div style={{ padding: "40px", textAlign: "center", color: "#374151", fontSize: "13px" }}>No users match your search.</div>
                        )}
                    </div>
                </div>
            </div>

            {/* ── Delete confirm modal ── */}
            {confirmDelete && (
                <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.7)", zIndex: 100, display: "flex", alignItems: "center", justifyContent: "center", backdropFilter: "blur(4px)" }}>
                    <div style={{ background: "#0d0f1a", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "16px", padding: "28px 32px", maxWidth: "400px", width: "90%" }}>
                        <div style={{ width: "44px", height: "44px", borderRadius: "12px", background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.2)", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: "16px" }}>
                            <svg width="20" height="20" fill="none" stroke="#ef4444" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" /></svg>
                        </div>
                        <h3 style={{ fontSize: "16px", fontWeight: 700, color: "#fff", margin: "0 0 8px" }}>Delete user?</h3>
                        <p style={{ fontSize: "13px", color: "#6B7280", margin: "0 0 6px" }}>This will permanently delete:</p>
                        <p style={{ fontSize: "13px", color: "#f87171", fontWeight: 600, margin: "0 0 18px", fontFamily: "monospace" }}>{confirmDelete.email}</p>
                        <p style={{ fontSize: "12px", color: "#374151", margin: "0 0 24px" }}>All their conversations, messages, and saved reports will also be deleted. This cannot be undone.</p>
                        <div style={{ display: "flex", gap: "10px", justifyContent: "flex-end" }}>
                            <button onClick={() => setConfirmDelete(null)} style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", color: "#9CA3AF", borderRadius: "8px", padding: "8px 18px", fontSize: "13px", cursor: "pointer" }}>Cancel</button>
                            <button onClick={() => handleDelete(confirmDelete)} disabled={deletingId === confirmDelete.id}
                                style={{ background: "rgba(239,68,68,0.15)", border: "1px solid rgba(239,68,68,0.3)", color: "#f87171", borderRadius: "8px", padding: "8px 18px", fontSize: "13px", fontWeight: 700, cursor: "pointer" }}>
                                {deletingId === confirmDelete.id ? "Deleting…" : "Yes, Delete"}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

/* ── Placeholder screens ─────────────────────────────────── */
const containerStyle = {};

function LoadingScreen() {
    return (
        <div style={{ minHeight: "100vh", background: "#080a12", display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column", gap: "16px" }}>
            <div style={{ width: "40px", height: "40px", border: "3px solid rgba(99,102,241,0.2)", borderTop: "3px solid #6366f1", borderRadius: "50%", animation: "spin 0.8s linear infinite" }} />
            <p style={{ color: "#6B7280", fontSize: "14px" }}>Loading admin panel…</p>
            <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        </div>
    );
}

function ForbiddenScreen() {
    const router = useRouter();
    return (
        <div style={{ minHeight: "100vh", background: "#080a12", display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column", gap: "16px", textAlign: "center" }}>
            <div style={{ width: "56px", height: "56px", borderRadius: "16px", background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.2)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <svg width="26" height="26" fill="none" stroke="#ef4444" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" /></svg>
            </div>
            <h2 style={{ color: "#fff", fontSize: "20px", fontWeight: 800, margin: 0 }}>Access Denied</h2>
            <p style={{ color: "#6B7280", fontSize: "14px", margin: 0, maxWidth: "320px" }}>This page is restricted to administrators only.</p>
            <button onClick={() => router.push("/dashboard")} style={{ marginTop: "8px", background: "rgba(99,102,241,0.1)", border: "1px solid rgba(99,102,241,0.2)", color: "#818cf8", borderRadius: "10px", padding: "10px 22px", fontSize: "13px", fontWeight: 600, cursor: "pointer" }}>← Back to Dashboard</button>
        </div>
    );
}

function ErrorScreen({ message, onRetry }: { message: string; onRetry: () => void }) {
    return (
        <div style={{ minHeight: "100vh", background: "#080a12", display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column", gap: "16px" }}>
            <p style={{ color: "#f87171", fontSize: "14px" }}>Error: {message}</p>
            <button onClick={onRetry} style={{ background: "rgba(99,102,241,0.1)", border: "1px solid rgba(99,102,241,0.2)", color: "#818cf8", borderRadius: "8px", padding: "8px 18px", fontSize: "13px", cursor: "pointer" }}>Retry</button>
        </div>
    );
}
