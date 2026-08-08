"use client";
import React, { useEffect, useState, use } from "react";
import Link from "next/link";

interface Member {
    id: string;
    role: string;
    joinedAt: string;
    user: { id: string; name: string | null; email: string };
}

const ROLE_COLORS: Record<string, string> = { owner: "#f59e0b", editor: "#6366f1", viewer: "#6B7280" };

const badge = (role: string): React.CSSProperties => ({
    display: "inline-block", padding: "2px 10px", borderRadius: "20px",
    fontSize: "10px", fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase",
    background: `${ROLE_COLORS[role] ?? "#6B7280"}18`,
    color: ROLE_COLORS[role] ?? "#6B7280",
    border: `1px solid ${ROLE_COLORS[role] ?? "#6B7280"}30`,
});

function timeAgo(iso: string) {
    const diff = Date.now() - new Date(iso).getTime();
    const d = Math.floor(diff / 86400000);
    if (d < 1) return "today";
    if (d === 1) return "yesterday";
    return `${d}d ago`;
}

export default function TeamMembersPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = use(params);
    const [members, setMembers] = useState<Member[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // Invite form
    const [email, setEmail] = useState("");
    const [role, setRole] = useState<"editor" | "viewer">("editor");
    const [inviting, setInviting] = useState(false);
    const [inviteErr, setInviteErr] = useState<string | null>(null);
    const [inviteOk, setInviteOk] = useState<string | null>(null);

    // Role update
    const [updatingId, setUpdatingId] = useState<string | null>(null);

    // Remove
    const [removingId, setRemovingId] = useState<string | null>(null);

    useEffect(() => {
        fetch(`/api/team/${id}/members`)
            .then((r) => r.json())
            .then((d) => {
                if (Array.isArray(d)) setMembers(d);
                else setError(d.error || "Failed to load members");
            })
            .catch(() => setError("Failed to load members"))
            .finally(() => setLoading(false));
    }, [id]);

    const handleInvite = async (e: React.FormEvent) => {
        e.preventDefault();
        setInviting(true);
        setInviteErr(null);
        setInviteOk(null);

        const res = await fetch(`/api/team/${id}/members`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ email, role }),
        });
        const data = await res.json();
        if (res.ok) {
            // Upsert in local list
            setMembers((prev) => {
                const idx = prev.findIndex((m) => m.id === data.id);
                if (idx >= 0) { const next = [...prev]; next[idx] = data; return next; }
                return [...prev, data];
            });
            setInviteOk(`${email} added as ${role}.`);
            setEmail("");
            setTimeout(() => setInviteOk(null), 3000);
        } else {
            setInviteErr(data.error || "Invite failed");
        }
        setInviting(false);
    };

    const handleRoleChange = async (memberId: string, newRole: string) => {
        setUpdatingId(memberId);
        const res = await fetch(`/api/team/${id}/members/${memberId}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ role: newRole }),
        });
        const data = await res.json();
        if (res.ok) {
            setMembers((prev) => prev.map((m) => (m.id === memberId ? { ...m, role: data.role } : m)));
        } else {
            alert(data.error || "Failed to update role");
        }
        setUpdatingId(null);
    };

    const handleRemove = async (memberId: string, memberName: string) => {
        if (!confirm(`Remove ${memberName} from the team?`)) return;
        setRemovingId(memberId);
        const res = await fetch(`/api/team/${id}/members/${memberId}`, { method: "DELETE" });
        const data = await res.json();
        if (res.ok) {
            setMembers((prev) => prev.filter((m) => m.id !== memberId));
        } else {
            alert(data.error || "Failed to remove member");
        }
        setRemovingId(null);
    };

    const inputStyle: React.CSSProperties = {
        background: "var(--bg-base)", border: "1px solid rgba(255,255,255,0.08)",
        borderRadius: "8px", color: "var(--text-primary)", padding: "9px 13px",
        fontSize: "12px", fontFamily: "inherit", outline: "none", transition: "border-color 0.15s",
    };

    return (
        <div style={{ maxWidth: "760px", margin: "0 auto", display: "flex", flexDirection: "column", gap: "20px" }}>
            <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>

            {/* Header */}
            <div>
                <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "4px" }}>
                    <Link href={`/dashboard/team/${id}`} style={{ fontSize: "12px", color: "#6B7280", textDecoration: "none" }}>← Team</Link>
                    <span style={{ color: "#374151" }}>/</span>
                    <span style={{ fontSize: "12px", color: "var(--text-primary)", fontWeight: 600 }}>Members</span>
                </div>
                <h1 style={{ fontSize: "20px", fontWeight: 800, color: "var(--text-primary)", margin: 0, letterSpacing: "-0.03em" }}>Team Members</h1>
            </div>

            {/* Invite form */}
            <div style={{ background: "#0d0f1a", border: "1px solid rgba(255,255,255,0.07)", borderRadius: "14px", padding: "20px 24px" }}>
                <h3 style={{ fontSize: "13px", fontWeight: 700, color: "var(--text-primary)", margin: "0 0 14px" }}>Invite by Email</h3>
                {inviteOk && <div style={{ background: "rgba(16,185,129,0.08)", border: "1px solid rgba(16,185,129,0.2)", borderRadius: "8px", padding: "9px 12px", fontSize: "12px", color: "#34d399", marginBottom: "10px" }}>✓ {inviteOk}</div>}
                {inviteErr && <div style={{ background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.2)", borderRadius: "8px", padding: "9px 12px", fontSize: "12px", color: "#f87171", marginBottom: "10px" }}>⚠ {inviteErr}</div>}
                <form onSubmit={handleInvite} style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
                    <input
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        required
                        placeholder="colleague@company.com"
                        style={{ ...inputStyle, flex: "1 1 240px" }}
                        onFocus={(e) => (e.currentTarget.style.borderColor = "#6366f1")}
                        onBlur={(e) => (e.currentTarget.style.borderColor = "rgba(255,255,255,0.08)")}
                    />
                    <select
                        value={role}
                        onChange={(e) => setRole(e.target.value as "editor" | "viewer")}
                        style={{ ...inputStyle, flexShrink: 0 }}
                    >
                        <option value="editor">Editor</option>
                        <option value="viewer">Viewer</option>
                    </select>
                    <button type="submit" disabled={inviting} style={{ padding: "9px 20px", borderRadius: "8px", fontSize: "12px", fontWeight: 700, background: "linear-gradient(135deg,#6366f1,#8b5cf6)", border: "none", color: "#fff", cursor: inviting ? "not-allowed" : "pointer", display: "flex", alignItems: "center", gap: "6px", flexShrink: 0 }}>
                        {inviting && <div style={{ width: "11px", height: "11px", border: "2px solid rgba(255,255,255,0.3)", borderTop: "2px solid #fff", borderRadius: "50%", animation: "spin 0.7s linear infinite" }} />}
                        {inviting ? "Inviting…" : "Add Member"}
                    </button>
                </form>
                <p style={{ fontSize: "11px", color: "#4B5563", margin: "10px 0 0" }}>
                    The user must already have a Talk2DB account. Roles: <strong style={{ color: "#6B7280" }}>Viewer</strong> = read-only, <strong style={{ color: "#818cf8" }}>Editor</strong> = can publish queries & pin items.
                </p>
            </div>

            {/* Members table */}
            {loading && (
                <div style={{ display: "flex", alignItems: "center", gap: "10px", justifyContent: "center", padding: "40px 0", color: "#6B7280", fontSize: "13px" }}>
                    <div style={{ width: "16px", height: "16px", border: "2px solid rgba(99,102,241,0.2)", borderTop: "2px solid #6366f1", borderRadius: "50%", animation: "spin 0.7s linear infinite" }} />
                    Loading…
                </div>
            )}

            {error && <div style={{ background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.2)", borderRadius: "10px", padding: "14px 16px", fontSize: "12px", color: "#f87171" }}>⚠ {error}</div>}

            {!loading && !error && (
                <div style={{ background: "#0d0f1a", border: "1px solid rgba(255,255,255,0.07)", borderRadius: "14px", overflow: "hidden" }}>
                    <div style={{ padding: "12px 20px", borderBottom: "1px solid rgba(255,255,255,0.06)", display: "grid", gridTemplateColumns: "1fr 100px 140px 80px", gap: "12px" }}>
                        {["User", "Role", "Joined", ""].map((h) => (
                            <span key={h} style={{ fontSize: "10px", fontWeight: 700, color: "#374151", textTransform: "uppercase", letterSpacing: "0.08em" }}>{h}</span>
                        ))}
                    </div>
                    {members.map((m, i) => (
                        <div key={m.id} style={{ display: "grid", gridTemplateColumns: "1fr 100px 140px 80px", gap: "12px", padding: "11px 20px", borderBottom: i < members.length - 1 ? "1px solid rgba(255,255,255,0.04)" : "none", alignItems: "center" }}>
                            <div style={{ display: "flex", alignItems: "center", gap: "10px", minWidth: 0 }}>
                                <div style={{ width: "28px", height: "28px", borderRadius: "50%", background: "linear-gradient(135deg,#6366f1,#8b5cf6)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "10px", fontWeight: 700, color: "#fff", flexShrink: 0 }}>
                                    {(m.user.name || m.user.email).slice(0, 2).toUpperCase()}
                                </div>
                                <div style={{ minWidth: 0 }}>
                                    <p style={{ fontSize: "12px", fontWeight: 600, color: "#D1D5DB", margin: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{m.user.name || "—"}</p>
                                    <p style={{ fontSize: "10px", color: "#4B5563", margin: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{m.user.email}</p>
                                </div>
                            </div>
                            <div>
                                {updatingId === m.id ? (
                                    <div style={{ width: "14px", height: "14px", border: "2px solid rgba(99,102,241,0.2)", borderTop: "2px solid #6366f1", borderRadius: "50%", animation: "spin 0.7s linear infinite" }} />
                                ) : (
                                    <select
                                        value={m.role}
                                        onChange={(e) => handleRoleChange(m.id, e.target.value)}
                                        style={{ background: "transparent", border: "1px solid rgba(255,255,255,0.08)", borderRadius: "6px", color: ROLE_COLORS[m.role] ?? "#6B7280", fontSize: "11px", fontWeight: 700, padding: "4px 8px", cursor: "pointer", outline: "none" }}
                                    >
                                        <option value="owner">Owner</option>
                                        <option value="editor">Editor</option>
                                        <option value="viewer">Viewer</option>
                                    </select>
                                )}
                            </div>
                            <span style={{ fontSize: "11px", color: "#4B5563" }}>{timeAgo(m.joinedAt)}</span>
                            <button
                                onClick={() => handleRemove(m.id, m.user.name || m.user.email)}
                                disabled={removingId === m.id}
                                style={{ padding: "5px 10px", borderRadius: "7px", fontSize: "11px", fontWeight: 600, background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.15)", color: "#f87171", cursor: removingId === m.id ? "not-allowed" : "pointer" }}
                            >
                                {removingId === m.id ? "…" : "Remove"}
                            </button>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
