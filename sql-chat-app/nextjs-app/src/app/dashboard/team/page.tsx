"use client";
import React, { useEffect, useState } from "react";
import Link from "next/link";

interface Team {
    id: string;
    name: string;
    slug: string;
    description: string | null;
    role: string;
    createdAt: string;
    _count: { members: number; teamDbs: number; sharedQueries: number; sharedDashboards: number };
}

const card: React.CSSProperties = {
    background: "#0d0f1a",
    border: "1px solid rgba(255,255,255,0.07)",
    borderRadius: "14px",
    padding: "22px 24px",
    transition: "border-color 0.15s",
    cursor: "pointer",
    display: "flex",
    flexDirection: "column",
    gap: "14px",
};

const badge = (color: string): React.CSSProperties => ({
    display: "inline-block",
    padding: "2px 10px",
    borderRadius: "20px",
    fontSize: "10px",
    fontWeight: 700,
    letterSpacing: "0.08em",
    textTransform: "uppercase",
    background: `${color}18`,
    color,
    border: `1px solid ${color}30`,
});

const ROLE_COLORS: Record<string, string> = {
    owner: "#f59e0b",
    editor: "#6366f1",
    viewer: "#6B7280",
};

function timeAgo(iso: string) {
    const diff = Date.now() - new Date(iso).getTime();
    const d = Math.floor(diff / 86400000);
    if (d < 1) return "today";
    if (d === 1) return "yesterday";
    if (d < 30) return `${d}d ago`;
    return new Date(iso).toLocaleDateString("en-US", { month: "short", year: "numeric" });
}

export default function TeamsPage() {
    const [teams, setTeams] = useState<Team[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        fetch("/api/team")
            .then((r) => r.json())
            .then((d) => {
                if (Array.isArray(d)) setTeams(d);
                else setError(d.error || "Failed to load teams");
            })
            .catch(() => setError("Failed to load teams"))
            .finally(() => setLoading(false));
    }, []);

    return (
        <div style={{ maxWidth: "900px", margin: "0 auto", display: "flex", flexDirection: "column", gap: "24px" }}>
            {/* Header */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "12px" }}>
                <div>
                    <h1 style={{ fontSize: "22px", fontWeight: 800, color: "var(--text-primary)", margin: "0 0 4px", letterSpacing: "-0.03em" }}>
                        Team Workspaces
                    </h1>
                    <p style={{ fontSize: "13px", color: "#6B7280", margin: 0 }}>
                        Collaborate with your data team — share queries, dashboards, and database connections.
                    </p>
                </div>
                <Link
                    href="/dashboard/team/new"
                    style={{
                        display: "inline-flex", alignItems: "center", gap: "7px",
                        padding: "9px 18px", borderRadius: "9px", fontSize: "12px", fontWeight: 700,
                        background: "linear-gradient(135deg,#6366f1,#8b5cf6)", color: "#fff",
                        textDecoration: "none", boxShadow: "0 4px 14px rgba(99,102,241,0.25)",
                    }}
                >
                    <svg width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                    </svg>
                    New Team
                </Link>
            </div>

            {loading && (
                <div style={{ display: "flex", alignItems: "center", gap: "10px", padding: "48px 0", justifyContent: "center", color: "#6B7280", fontSize: "13px" }}>
                    <div style={{ width: "16px", height: "16px", border: "2px solid rgba(99,102,241,0.2)", borderTop: "2px solid #6366f1", borderRadius: "50%", animation: "spin 0.7s linear infinite" }} />
                    Loading teams…
                </div>
            )}

            {error && (
                <div style={{ background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.2)", borderRadius: "10px", padding: "14px 16px" }}>
                    <p style={{ fontSize: "12px", color: "#f87171", margin: 0 }}>⚠ {error}</p>
                </div>
            )}

            {!loading && !error && teams.length === 0 && (
                <div style={{ ...card, textAlign: "center", padding: "60px 24px", cursor: "default" }}>
                    <div style={{ width: "56px", height: "56px", borderRadius: "16px", background: "rgba(99,102,241,0.1)", border: "1px solid rgba(99,102,241,0.15)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 16px" }}>
                        <svg width="26" height="26" fill="none" stroke="#6366f1" strokeWidth="2" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M18 18.72a9.094 9.094 0 003.741-.479 3 3 0 00-4.682-2.72m.94 3.198l.001.031c0 .225-.012.447-.037.666A11.944 11.944 0 0112 21c-2.17 0-4.207-.576-5.963-1.584A6.062 6.062 0 016 18.719m12 0a5.971 5.971 0 00-.941-3.197m0 0A5.995 5.995 0 0012 12.75a5.995 5.995 0 00-5.058 2.772m0 0a3 3 0 00-4.681 2.72 8.986 8.986 0 003.74.477m.94-3.197a5.971 5.971 0 00-.94 3.197M15 6.75a3 3 0 11-6 0 3 3 0 016 0zm6 3a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0zm-13.5 0a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0z" />
                        </svg>
                    </div>
                    <h3 style={{ fontSize: "16px", fontWeight: 700, color: "var(--text-primary)", margin: "0 0 8px" }}>No teams yet</h3>
                    <p style={{ fontSize: "13px", color: "#6B7280", margin: "0 0 20px" }}>
                        Create a team workspace to share queries and dashboards with your colleagues.
                    </p>
                    <Link href="/dashboard/team/new" style={{ fontSize: "12px", fontWeight: 700, color: "#818cf8", textDecoration: "none" }}>
                        Create your first team →
                    </Link>
                </div>
            )}

            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(380px, 1fr))", gap: "16px" }}>
                {teams.map((team) => (
                    <Link key={team.id} href={`/dashboard/team/${team.id}`} style={{ textDecoration: "none" }}>
                        <div
                            style={card}
                            onMouseEnter={(e) => ((e.currentTarget as HTMLElement).style.borderColor = "rgba(99,102,241,0.35)")}
                            onMouseLeave={(e) => ((e.currentTarget as HTMLElement).style.borderColor = "rgba(255,255,255,0.07)")}
                        >
                            <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: "12px" }}>
                                <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                                    <div style={{ width: "40px", height: "40px", borderRadius: "12px", background: "linear-gradient(135deg,#6366f1,#8b5cf6)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, fontSize: "15px", fontWeight: 800, color: "#fff" }}>
                                        {team.name.slice(0, 2).toUpperCase()}
                                    </div>
                                    <div>
                                        <h3 style={{ fontSize: "15px", fontWeight: 700, color: "var(--text-primary)", margin: "0 0 3px" }}>{team.name}</h3>
                                        <p style={{ fontSize: "11px", color: "#6B7280", margin: 0, fontFamily: "monospace" }}>/{team.slug}</p>
                                    </div>
                                </div>
                                <span style={badge(ROLE_COLORS[team.role] ?? "#6B7280")}>{team.role}</span>
                            </div>

                            {team.description && (
                                <p style={{ fontSize: "12px", color: "#9CA3AF", lineHeight: 1.55, margin: 0 }}>{team.description}</p>
                            )}

                            <div style={{ display: "flex", gap: "18px", paddingTop: "6px", borderTop: "1px solid rgba(255,255,255,0.05)" }}>
                                {[
                                    { val: team._count.members, label: "members" },
                                    { val: team._count.teamDbs, label: "databases" },
                                    { val: team._count.sharedQueries, label: "queries" },
                                    { val: team._count.sharedDashboards, label: "pins" },
                                ].map(({ val, label }) => (
                                    <div key={label}>
                                        <p style={{ fontSize: "16px", fontWeight: 800, color: "var(--text-primary)", margin: "0 0 1px", letterSpacing: "-0.02em" }}>{val}</p>
                                        <p style={{ fontSize: "10px", color: "#4B5563", margin: 0, textTransform: "uppercase", letterSpacing: "0.06em" }}>{label}</p>
                                    </div>
                                ))}
                                <div style={{ marginLeft: "auto", textAlign: "right" }}>
                                    <p style={{ fontSize: "10px", color: "#374151", margin: "0 0 1px" }}>created</p>
                                    <p style={{ fontSize: "11px", color: "#4B5563", margin: 0 }}>{timeAgo(team.createdAt)}</p>
                                </div>
                            </div>
                        </div>
                    </Link>
                ))}
            </div>

            <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        </div>
    );
}
