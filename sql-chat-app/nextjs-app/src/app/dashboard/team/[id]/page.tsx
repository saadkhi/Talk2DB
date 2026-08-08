"use client";
import React, { useEffect, useState, use } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

interface TeamDetail {
    id: string;
    name: string;
    slug: string;
    description: string | null;
    currentUserRole: string;
    createdAt: string;
    members: Array<{
        id: string;
        role: string;
        joinedAt: string;
        user: { id: string; name: string | null; email: string };
    }>;
    teamDbs: Array<{ id: string; name: string; dbDialect: string; createdAt: string }>;
    _count: { sharedQueries: number; sharedDashboards: number };
}

const ROLE_COLORS: Record<string, string> = { owner: "#f59e0b", editor: "#6366f1", viewer: "#6B7280" };
const badge = (role: string): React.CSSProperties => ({
    display: "inline-block", padding: "2px 10px", borderRadius: "20px",
    fontSize: "10px", fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase",
    background: `${ROLE_COLORS[role] ?? "#6B7280"}18`,
    color: ROLE_COLORS[role] ?? "#6B7280",
    border: `1px solid ${ROLE_COLORS[role] ?? "#6B7280"}30`,
});

function StatBox({ value, label, color }: { value: number | string; label: string; color: string }) {
    return (
        <div style={{ textAlign: "center", padding: "16px 20px", background: "#0a0c18", borderRadius: "10px", border: "1px solid rgba(255,255,255,0.06)" }}>
            <p style={{ fontSize: "26px", fontWeight: 800, color: "var(--text-primary)", margin: "0 0 2px", letterSpacing: "-0.04em" }}>{value}</p>
            <p style={{ fontSize: "10px", color: "#4B5563", margin: 0, textTransform: "uppercase", letterSpacing: "0.08em" }}>{label}</p>
        </div>
    );
}

export default function TeamDetailPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = use(params);
    const router = useRouter();
    const [team, setTeam] = useState<TeamDetail | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [deleting, setDeleting] = useState(false);

    useEffect(() => {
        fetch(`/api/team/${id}`)
            .then((r) => r.json())
            .then((d) => {
                if (d.error) setError(d.error);
                else setTeam(d);
            })
            .catch(() => setError("Failed to load team"))
            .finally(() => setLoading(false));
    }, [id]);

    const handleDelete = async () => {
        if (!confirm(`Delete team "${team?.name}"? This cannot be undone.`)) return;
        setDeleting(true);
        const res = await fetch(`/api/team/${id}`, { method: "DELETE" });
        if (res.ok) router.push("/dashboard/team");
        else {
            const d = await res.json();
            alert(d.error || "Delete failed");
            setDeleting(false);
        }
    };

    if (loading) return (
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", padding: "80px 0", gap: "10px", color: "#6B7280" }}>
            <div style={{ width: "18px", height: "18px", border: "2px solid rgba(99,102,241,0.2)", borderTop: "2px solid #6366f1", borderRadius: "50%", animation: "spin 0.7s linear infinite" }} />
            Loading team…
            <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        </div>
    );

    if (error) return (
        <div style={{ maxWidth: "560px", margin: "0 auto", padding: "40px 0" }}>
            <div style={{ background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.2)", borderRadius: "10px", padding: "16px 20px" }}>
                <p style={{ fontSize: "13px", color: "#f87171", margin: 0 }}>⚠ {error}</p>
            </div>
        </div>
    );

    if (!team) return null;

    const isOwner = team.currentUserRole === "owner";
    const isEditor = isOwner || team.currentUserRole === "editor";

    return (
        <div style={{ maxWidth: "900px", margin: "0 auto", display: "flex", flexDirection: "column", gap: "24px" }}>
            <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>

            {/* Header */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "12px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "14px" }}>
                    <div style={{ width: "48px", height: "48px", borderRadius: "14px", background: "linear-gradient(135deg,#6366f1,#8b5cf6)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "18px", fontWeight: 800, color: "#fff", flexShrink: 0 }}>
                        {team.name.slice(0, 2).toUpperCase()}
                    </div>
                    <div>
                        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                            <h1 style={{ fontSize: "22px", fontWeight: 800, color: "var(--text-primary)", margin: 0, letterSpacing: "-0.03em" }}>{team.name}</h1>
                            <span style={badge(team.currentUserRole)}>You: {team.currentUserRole}</span>
                        </div>
                        {team.description && <p style={{ fontSize: "13px", color: "#6B7280", margin: "4px 0 0" }}>{team.description}</p>}
                    </div>
                </div>
                {isOwner && (
                    <button
                        onClick={handleDelete}
                        disabled={deleting}
                        style={{ padding: "8px 16px", borderRadius: "8px", fontSize: "12px", fontWeight: 700, background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.2)", color: "#f87171", cursor: deleting ? "not-allowed" : "pointer" }}
                    >
                        {deleting ? "Deleting…" : "Delete Team"}
                    </button>
                )}
            </div>

            {/* Stats */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "12px" }}>
                <StatBox value={team.members.length} label="Members" color="#6366f1" />
                <StatBox value={team.teamDbs.length} label="Databases" color="#10b981" />
                <StatBox value={team._count.sharedQueries} label="Queries" color="#f59e0b" />
                <StatBox value={team._count.sharedDashboards} label="Pinned Items" color="#8b5cf6" />
            </div>

            {/* Quick nav cards */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: "14px" }}>
                {[
                    {
                        href: `/dashboard/team/${id}/queries`,
                        title: "Query Library",
                        desc: "Browse, search, and fork shared SQL queries.",
                        count: team._count.sharedQueries,
                        color: "#f59e0b",
                        icon: (
                            <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M17.25 6.75L22.5 12l-5.25 5.25m-10.5 0L1.5 12l5.25-5.25m7.5-3l-4.5 16.5" />
                            </svg>
                        ),
                    },
                    {
                        href: `/dashboard/team/${id}/dashboard`,
                        title: "Shared Dashboard",
                        desc: "Pinned charts and metrics visible to the whole team.",
                        count: team._count.sharedDashboards,
                        color: "#3b82f6",
                        icon: (
                            <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M7.5 14.25v2.25m3-4.5v4.5m3-6.75v6.75m3-9v9M6 20.25h12A2.25 2.25 0 0020.25 18V6A2.25 2.25 0 0018 3.75H6A2.25 2.25 0 003.75 6v12A2.25 2.25 0 006 20.25z" />
                            </svg>
                        ),
                    },
                    {
                        href: `/dashboard/team/${id}/members`,
                        title: "Members",
                        desc: "View and manage team members and their roles.",
                        count: team.members.length,
                        color: "#10b981",
                        icon: (
                            <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M18 18.72a9.094 9.094 0 003.741-.479 3 3 0 00-4.682-2.72m.94 3.198l.001.031c0 .225-.012.447-.037.666A11.944 11.944 0 0112 21c-2.17 0-4.207-.576-5.963-1.584A6.062 6.062 0 016 18.719m12 0a5.971 5.971 0 00-.941-3.197m0 0A5.995 5.995 0 0012 12.75a5.995 5.995 0 00-5.058 2.772m0 0a3 3 0 00-4.681 2.72 8.986 8.986 0 003.74.477m.94-3.197a5.971 5.971 0 00-.94 3.197M15 6.75a3 3 0 11-6 0 3 3 0 016 0zm6 3a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0zm-13.5 0a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0z" />
                            </svg>
                        ),
                    },
                ].map((item) => (
                    <Link key={item.href} href={item.href} style={{ textDecoration: "none" }}>
                        <div
                            style={{ background: "#0d0f1a", border: "1px solid rgba(255,255,255,0.07)", borderRadius: "12px", padding: "18px 20px", display: "flex", gap: "14px", alignItems: "flex-start", transition: "border-color 0.15s", cursor: "pointer" }}
                            onMouseEnter={(e) => ((e.currentTarget as HTMLElement).style.borderColor = `${item.color}44`)}
                            onMouseLeave={(e) => ((e.currentTarget as HTMLElement).style.borderColor = "rgba(255,255,255,0.07)")}
                        >
                            <div style={{ width: "36px", height: "36px", borderRadius: "10px", background: `${item.color}18`, color: item.color, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                                {item.icon}
                            </div>
                            <div style={{ flex: 1 }}>
                                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "4px" }}>
                                    <p style={{ fontSize: "13px", fontWeight: 700, color: "var(--text-primary)", margin: 0 }}>{item.title}</p>
                                    <span style={{ fontSize: "12px", fontWeight: 700, color: item.color }}>{item.count}</span>
                                </div>
                                <p style={{ fontSize: "11px", color: "#6B7280", margin: 0, lineHeight: 1.5 }}>{item.desc}</p>
                            </div>
                        </div>
                    </Link>
                ))}
            </div>

            {/* Team Databases */}
            <div style={{ background: "#0d0f1a", border: "1px solid rgba(255,255,255,0.07)", borderRadius: "14px", overflow: "hidden" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "16px 20px", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                        <div style={{ width: "7px", height: "7px", borderRadius: "50%", background: "#10b981" }} />
                        <span style={{ fontSize: "13px", fontWeight: 700, color: "var(--text-primary)" }}>Team Databases</span>
                    </div>
                    {isEditor && (
                        <Link href={`/dashboard/team/${id}/members`} style={{ fontSize: "11px", color: "#10b981", textDecoration: "none", fontWeight: 600 }}>
                            Manage →
                        </Link>
                    )}
                </div>
                <div style={{ padding: "8px 0" }}>
                    {team.teamDbs.length === 0 ? (
                        <p style={{ fontSize: "12px", color: "#4B5563", padding: "20px", textAlign: "center", margin: 0 }}>
                            No team databases yet.{isEditor ? " Add one from the Members page." : ""}
                        </p>
                    ) : (
                        team.teamDbs.map((db, i) => (
                            <div key={db.id} style={{ display: "flex", alignItems: "center", gap: "12px", padding: "10px 20px", borderBottom: i < team.teamDbs.length - 1 ? "1px solid rgba(255,255,255,0.04)" : "none" }}>
                                <div style={{ width: "30px", height: "30px", borderRadius: "8px", background: "rgba(16,185,129,0.1)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                                    <svg width="13" height="13" fill="none" stroke="#10b981" strokeWidth="2" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M20.25 6.375c0 2.278-3.694 4.125-8.25 4.125S3.75 8.653 3.75 6.375m16.5 0c0-2.278-3.694-4.125-8.25-4.125S3.75 4.097 3.75 6.375m16.5 0v11.25c0 2.278-3.694 4.125-8.25 4.125s-8.25-1.847-8.25-4.125V6.375m16.5 2.625c0 2.278-3.694 4.125-8.25 4.125s-8.25-1.847-8.25-4.125" />
                                    </svg>
                                </div>
                                <div>
                                    <p style={{ fontSize: "12px", fontWeight: 600, color: "#D1D5DB", margin: "0 0 2px" }}>{db.name}</p>
                                    <p style={{ fontSize: "10px", color: "#4B5563", margin: 0, textTransform: "uppercase" }}>{db.dbDialect}</p>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </div>

            {/* Recent members */}
            <div style={{ background: "#0d0f1a", border: "1px solid rgba(255,255,255,0.07)", borderRadius: "14px", overflow: "hidden" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "16px 20px", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                        <div style={{ width: "7px", height: "7px", borderRadius: "50%", background: "#6366f1" }} />
                        <span style={{ fontSize: "13px", fontWeight: 700, color: "var(--text-primary)" }}>Members</span>
                    </div>
                    <Link href={`/dashboard/team/${id}/members`} style={{ fontSize: "11px", color: "#6366f1", textDecoration: "none", fontWeight: 600 }}>
                        Manage →
                    </Link>
                </div>
                <div style={{ padding: "8px 0" }}>
                    {team.members.slice(0, 6).map((m, i) => (
                        <div key={m.id} style={{ display: "flex", alignItems: "center", gap: "12px", padding: "9px 20px", borderBottom: i < Math.min(team.members.length, 6) - 1 ? "1px solid rgba(255,255,255,0.04)" : "none" }}>
                            <div style={{ width: "30px", height: "30px", borderRadius: "50%", background: "linear-gradient(135deg,#6366f1,#8b5cf6)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "11px", fontWeight: 700, color: "#fff", flexShrink: 0 }}>
                                {(m.user.name || m.user.email).slice(0, 2).toUpperCase()}
                            </div>
                            <div style={{ flex: 1, minWidth: 0 }}>
                                <p style={{ fontSize: "12px", fontWeight: 600, color: "#D1D5DB", margin: "0 0 1px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                                    {m.user.name || m.user.email}
                                </p>
                                <p style={{ fontSize: "10px", color: "#4B5563", margin: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{m.user.email}</p>
                            </div>
                            <span style={badge(m.role)}>{m.role}</span>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}
