"use client";
import React, { useState } from "react";
import { useRouter } from "next/navigation";

const inputStyle: React.CSSProperties = {
    background: "var(--bg-base)", border: "1px solid rgba(255,255,255,0.08)",
    borderRadius: "9px", color: "var(--text-primary)", padding: "10px 14px",
    fontSize: "13px", fontFamily: "inherit", width: "100%", boxSizing: "border-box",
    outline: "none", transition: "border-color 0.15s",
};

const label: React.CSSProperties = {
    fontSize: "11px", fontWeight: 700, color: "#6B7280",
    textTransform: "uppercase", letterSpacing: "0.08em",
    display: "block", marginBottom: "6px",
};

export default function NewTeamPage() {
    const router = useRouter();
    const [name, setName] = useState("");
    const [description, setDescription] = useState("");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);

        try {
            const res = await fetch("/api/team", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ name, description }),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || "Failed to create team");
            router.push(`/dashboard/team/${data.id}`);
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div style={{ maxWidth: "560px", margin: "0 auto" }}>
            <div style={{ marginBottom: "28px" }}>
                <h1 style={{ fontSize: "22px", fontWeight: 800, color: "var(--text-primary)", margin: "0 0 4px", letterSpacing: "-0.03em" }}>
                    Create Team Workspace
                </h1>
                <p style={{ fontSize: "13px", color: "#6B7280", margin: 0 }}>
                    A workspace lets your team share queries, dashboards, and database connections.
                </p>
            </div>

            <div style={{ background: "#0d0f1a", border: "1px solid rgba(255,255,255,0.07)", borderRadius: "14px", padding: "24px" }}>
                <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "18px" }}>
                    {error && (
                        <div style={{ background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.2)", borderRadius: "8px", padding: "10px 14px", fontSize: "12px", color: "#f87171" }}>
                            ⚠ {error}
                        </div>
                    )}

                    <div>
                        <label style={label}>Team Name *</label>
                        <input
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            placeholder="e.g. Data Analytics Team"
                            required
                            style={inputStyle}
                            onFocus={(e) => (e.currentTarget.style.borderColor = "#6366f1")}
                            onBlur={(e) => (e.currentTarget.style.borderColor = "rgba(255,255,255,0.08)")}
                        />
                    </div>

                    <div>
                        <label style={label}>Description (optional)</label>
                        <textarea
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            placeholder="What does this team work on?"
                            rows={3}
                            style={{ ...inputStyle, resize: "vertical", lineHeight: 1.55 }}
                            onFocus={(e) => (e.currentTarget.style.borderColor = "#6366f1")}
                            onBlur={(e) => (e.currentTarget.style.borderColor = "rgba(255,255,255,0.08)")}
                        />
                    </div>

                    <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px", paddingTop: "4px" }}>
                        <button
                            type="button"
                            onClick={() => router.back()}
                            style={{
                                padding: "9px 20px", borderRadius: "9px", fontSize: "12px", fontWeight: 600,
                                background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.1)",
                                color: "#9CA3AF", cursor: "pointer",
                            }}
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={loading || !name.trim()}
                            style={{
                                padding: "9px 22px", borderRadius: "9px", fontSize: "12px", fontWeight: 700,
                                background: loading || !name.trim() ? "rgba(99,102,241,0.4)" : "linear-gradient(135deg,#6366f1,#8b5cf6)",
                                border: "none", color: "#fff", cursor: loading || !name.trim() ? "not-allowed" : "pointer",
                                display: "flex", alignItems: "center", gap: "7px",
                                boxShadow: loading ? "none" : "0 4px 14px rgba(99,102,241,0.25)",
                            }}
                        >
                            {loading && (
                                <div style={{ width: "12px", height: "12px", border: "2px solid rgba(255,255,255,0.3)", borderTop: "2px solid #fff", borderRadius: "50%", animation: "spin 0.7s linear infinite" }} />
                            )}
                            {loading ? "Creating…" : "Create Team"}
                        </button>
                    </div>
                </form>
            </div>

            <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        </div>
    );
}
