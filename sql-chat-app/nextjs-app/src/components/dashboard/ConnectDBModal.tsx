"use client";

import React, { useState } from "react";
import { useDatabase } from "@/context/DatabaseContext";

interface ConnectDBModalProps {
    isOpen: boolean;
    onClose: () => void;
}

export default function ConnectDBModal({ isOpen, onClose }: ConnectDBModalProps) {
    const { checkConnectionStatus, dbConnected, disconnectDatabase } = useDatabase();
    const [connectionString, setConnectionString] = useState("");
    const [dialect, setDialect] = useState<"postgresql" | "mysql" | "sqlite">("postgresql");
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState(false);
    const [view, setView] = useState<"connect" | "confirm-disconnect">("connect");
    const [disconnecting, setDisconnecting] = useState(false);
    const [disconnectError, setDisconnectError] = useState<string | null>(null);

    const handleDisconnect = async () => {
        setDisconnecting(true);
        setDisconnectError(null);
        try {
            await disconnectDatabase();
            setView("connect");
            onClose();
        } catch (err: any) {
            setDisconnectError(err.message || "Failed to disconnect");
        } finally {
            setDisconnecting(false);
        }
    };

    if (!isOpen) return null;

    // ── Disconnect confirmation panel ──────────────────────────────────────
    if (view === "confirm-disconnect") {
        return (
            <>
                <div style={{ position: "fixed", inset: 0, zIndex: 100, background: "rgba(0,0,0,0.75)", backdropFilter: "blur(6px)", display: "flex", alignItems: "center", justifyContent: "center", padding: "20px" }}>
                    <div onClick={e => e.stopPropagation()} style={{ width: "100%", maxWidth: "420px", background: "#0d0f1a", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "18px", padding: "28px 28px 24px", boxShadow: "0 24px 80px rgba(0,0,0,0.6)", animation: "modalIn 0.2s cubic-bezier(0.16,1,0.3,1) forwards" }}>
                        {/* Icon */}
                        <div style={{ width: "44px", height: "44px", borderRadius: "12px", background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.2)", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: "16px" }}>
                            <svg width="20" height="20" fill="none" stroke="#ef4444" strokeWidth="2" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M13.19 8.688a4.5 4.5 0 011.242 7.244l-4.5 4.5a4.5 4.5 0 01-6.364-6.364l1.757-1.757m13.35-.622l1.757-1.757a4.5 4.5 0 00-6.364-6.364l-4.5 4.5a4.5 4.5 0 001.242 7.244" />
                            </svg>
                        </div>
                        <h3 style={{ fontSize: "17px", fontWeight: 800, color: "#fff", margin: "0 0 8px" }}>Disconnect Database?</h3>
                        <p style={{ fontSize: "13px", color: "#6B7280", lineHeight: 1.6, margin: "0 0 20px" }}>
                            This removes your stored connection string. All tools (Query Studio, Visualizer, Reports) will stop working until you reconnect.
                        </p>
                        {disconnectError && (
                            <p style={{ fontSize: "12px", color: "#f87171", margin: "0 0 14px", background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.2)", borderRadius: "8px", padding: "10px 12px" }}>
                                ⚠ {disconnectError}
                            </p>
                        )}
                        <div style={{ display: "flex", gap: "10px", justifyContent: "flex-end" }}>
                            <button onClick={() => { setView("connect"); setDisconnectError(null); }} style={{ padding: "9px 20px", borderRadius: "9px", background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", color: "#9CA3AF", fontSize: "13px", fontWeight: 600, cursor: "pointer" }}>Cancel</button>
                            <button onClick={handleDisconnect} disabled={disconnecting} style={{ padding: "9px 20px", borderRadius: "9px", background: disconnecting ? "rgba(239,68,68,0.3)" : "rgba(239,68,68,0.15)", border: "1px solid rgba(239,68,68,0.3)", color: "#f87171", fontSize: "13px", fontWeight: 700, cursor: disconnecting ? "not-allowed" : "pointer", display: "flex", alignItems: "center", gap: "7px" }}>
                                {disconnecting && <div style={{ width: "13px", height: "13px", border: "2px solid rgba(248,113,113,0.3)", borderTop: "2px solid #f87171", borderRadius: "50%", animation: "spin 0.7s linear infinite" }} />}
                                {disconnecting ? "Disconnecting…" : "Yes, Disconnect"}
                            </button>
                        </div>
                    </div>
                </div>
                <style>{`@keyframes modalIn { from { opacity:0; transform:scale(0.96) translateY(8px); } to { opacity:1; transform:scale(1) translateY(0); } } @keyframes spin { to { transform:rotate(360deg); } }`}</style>
            </>
        );
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!connectionString.trim()) return;

        setSubmitting(true);
        setError(null);
        setSuccess(false);

        try {
            const res = await fetch("/api/user/connect-db", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ connectionString, dialect }),
            });

            const data = await res.json();
            if (!res.ok) throw new Error(data.error || "Failed to verify database connection");

            setSuccess(true);
            await checkConnectionStatus();
            setTimeout(() => {
                onClose();
                setSuccess(false);
                setConnectionString("");
            }, 1200);
        } catch (err: any) {
            setError(err.message || "Could not connect. Please check your credentials.");
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <>
            {/* Backdrop */}
            <div
                onClick={onClose}
                style={{
                    position: "fixed", inset: 0, zIndex: 100,
                    background: "rgba(0,0,0,0.75)",
                    backdropFilter: "blur(6px)",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    padding: "20px",
                }}
            >
                {/* Modal card */}
                <div
                    onClick={e => e.stopPropagation()}
                    style={{
                        width: "100%", maxWidth: "480px",
                        background: "#0d0f1a",
                        border: "1px solid rgba(255,255,255,0.1)",
                        borderRadius: "18px",
                        padding: "28px 28px 24px",
                        position: "relative",
                        boxShadow: "0 24px 80px rgba(0,0,0,0.6), 0 0 0 1px rgba(99,102,241,0.08)",
                        animation: "modalIn 0.2s cubic-bezier(0.16,1,0.3,1) forwards",
                    }}
                >
                    {/* Close button — always visible */}
                    <button
                        onClick={onClose}
                        aria-label="Close"
                        style={{
                            position: "absolute", top: "16px", right: "16px",
                            background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)",
                            borderRadius: "8px", width: "30px", height: "30px",
                            display: "flex", alignItems: "center", justifyContent: "center",
                            cursor: "pointer", color: "#6B7280", transition: "all 0.15s",
                        }}
                        onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = "#fff"; (e.currentTarget as HTMLElement).style.background = "rgba(255,255,255,0.1)"; }}
                        onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = "#6B7280"; (e.currentTarget as HTMLElement).style.background = "rgba(255,255,255,0.05)"; }}
                    >
                        <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>

                    {/* Disconnect button — only when already connected */}
                    {dbConnected && (
                        <button
                            onClick={() => { setView("confirm-disconnect"); setDisconnectError(null); }}
                            style={{
                                position: "absolute", top: "16px", right: "54px",
                                background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.18)",
                                borderRadius: "8px", padding: "5px 12px",
                                display: "flex", alignItems: "center", gap: "5px",
                                cursor: "pointer", color: "#f87171", fontSize: "11px", fontWeight: 700,
                                transition: "all 0.15s",
                            }}
                            onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = "rgba(239,68,68,0.14)"}
                            onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = "rgba(239,68,68,0.08)"}
                        >
                            <svg width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M13.19 8.688a4.5 4.5 0 011.242 7.244l-4.5 4.5a4.5 4.5 0 01-6.364-6.364l1.757-1.757m13.35-.622l1.757-1.757a4.5 4.5 0 00-6.364-6.364l-4.5 4.5a4.5 4.5 0 001.242 7.244" />
                            </svg>
                            Disconnect
                        </button>
                    )}

                    {/* Header */}
                    <div style={{ display: "flex", alignItems: "center", gap: "14px", marginBottom: "10px" }}>
                        <div style={{
                            width: "42px", height: "42px", borderRadius: "12px", flexShrink: 0,
                            background: "linear-gradient(135deg, rgba(99,102,241,0.2), rgba(139,92,246,0.15))",
                            border: "1px solid rgba(99,102,241,0.25)",
                            display: "flex", alignItems: "center", justifyContent: "center",
                        }}>
                            <svg width="20" height="20" fill="none" stroke="#818cf8" strokeWidth="2" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M20.25 6.375c0 2.278-3.694 4.125-8.25 4.125S3.75 8.653 3.75 6.375m16.5 0c0-2.278-3.694-4.125-8.25-4.125S3.75 4.097 3.75 6.375m16.5 0v11.25c0 2.278-3.694 4.125-8.25 4.125s-8.25-1.847-8.25-4.125V6.375m16.5 2.625c0 2.278-3.694 4.125-8.25 4.125s-8.25-1.847-8.25-4.125" />
                            </svg>
                        </div>
                        <div>
                            <h2 style={{ fontSize: "17px", fontWeight: 800, color: "#fff", margin: 0, letterSpacing: "-0.02em" }}>
                                {dbConnected ? "Update Database Connection" : "Connect Your Database"}
                            </h2>
                            <p style={{ fontSize: "12px", color: "#6B7280", margin: "2px 0 0" }}>PostgreSQL · Neon · Supabase · RDS</p>
                        </div>
                    </div>

                    <p style={{ fontSize: "13px", color: "#6B7280", lineHeight: 1.6, marginBottom: "22px" }}>
                        Paste your connection string below — or the full <code style={{ background: "rgba(255,255,255,0.06)", padding: "1px 5px", borderRadius: "4px", fontSize: "11px", fontFamily: "monospace" }}>psql '...'</code> command. It's encrypted with AES-256 and stored securely — never logged or shared.
                    </p>

                    <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "16px" }}>

                        {/* Error */}
                        {error && (
                            <div style={{
                                display: "flex", alignItems: "flex-start", gap: "10px",
                                padding: "12px 14px", borderRadius: "10px",
                                background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.2)",
                            }}>
                                <svg width="15" height="15" fill="none" stroke="#f87171" strokeWidth="2" viewBox="0 0 24 24" style={{ flexShrink: 0, marginTop: "1px" }}>
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
                                </svg>
                                <span style={{ fontSize: "12px", color: "#fca5a5", lineHeight: 1.55 }}>{error}</span>
                            </div>
                        )}

                        {/* Success */}
                        {success && (
                            <div style={{
                                display: "flex", alignItems: "center", gap: "10px",
                                padding: "12px 14px", borderRadius: "10px",
                                background: "rgba(16,185,129,0.08)", border: "1px solid rgba(16,185,129,0.2)",
                            }}>
                                <svg width="15" height="15" fill="none" stroke="#34d399" strokeWidth="2.5" viewBox="0 0 24 24" style={{ flexShrink: 0 }}>
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                                </svg>
                                <span style={{ fontSize: "12px", color: "#6ee7b7", fontWeight: 600 }}>
                                    Connected successfully! Closing…
                                </span>
                            </div>
                        )}

                        {/* Input */}
                        <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                            <label style={{ fontSize: "11px", fontWeight: 700, color: "#9CA3AF", textTransform: "uppercase", letterSpacing: "0.08em" }}>
                                Database Dialect
                            </label>
                            <div style={{ display: "flex", gap: "8px" }}>
                                {(["postgresql", "mysql", "sqlite"] as const).map(d => {
                                    const labels: Record<string, string> = { postgresql: "PostgreSQL", mysql: "MySQL", sqlite: "SQLite" };
                                    const active = dialect === d;
                                    return (
                                        <button
                                            key={d}
                                            type="button"
                                            onClick={() => setDialect(d)}
                                            style={{
                                                flex: 1, padding: "8px 0", borderRadius: "8px", fontSize: "12px",
                                                fontWeight: 600, cursor: "pointer", transition: "all 0.15s",
                                                background: active ? "rgba(99,102,241,0.15)" : "rgba(255,255,255,0.03)",
                                                border: active ? "1px solid rgba(99,102,241,0.4)" : "1px solid rgba(255,255,255,0.07)",
                                                color: active ? "#a5b4fc" : "#6B7280",
                                            }}
                                        >
                                            {labels[d]}
                                        </button>
                                    );
                                })}
                            </div>
                        </div>

                        <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                            <label style={{ fontSize: "11px", fontWeight: 700, color: "#9CA3AF", textTransform: "uppercase", letterSpacing: "0.08em" }}>
                                Connection String
                            </label>
                            <div style={{ position: "relative" }}>
                                <textarea
                                    placeholder={
                                        dialect === "postgresql"
                                            ? "postgresql://user:pass@host:5432/dbname?sslmode=require"
                                            : dialect === "mysql"
                                            ? "mysql://user:pass@host:3306/dbname"
                                            : "file:/path/to/database.sqlite"
                                    }
                                    value={connectionString}
                                    onChange={e => setConnectionString(e.target.value)}
                                    disabled={submitting || success}
                                    required
                                    rows={3}
                                    style={{
                                        width: "100%", boxSizing: "border-box",
                                        background: "#080a12",
                                        border: "1px solid rgba(255,255,255,0.08)",
                                        borderRadius: "10px", padding: "12px 14px",
                                        fontSize: "12px", fontFamily: "'Geist Mono', 'Fira Code', monospace",
                                        color: "#e2e8f0", lineHeight: 1.65, resize: "vertical",
                                        outline: "none", transition: "border-color 0.15s",
                                    }}
                                    onFocus={e => (e.currentTarget.style.borderColor = "rgba(99,102,241,0.5)")}
                                    onBlur={e => (e.currentTarget.style.borderColor = "rgba(255,255,255,0.08)")}
                                />
                            </div>

                            {/* Dynamic example hint */}
                            <div style={{
                                display: "flex", alignItems: "flex-start", gap: "8px",
                                padding: "10px 12px", borderRadius: "8px",
                                background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)",
                            }}>
                                <svg width="12" height="12" fill="none" stroke="#4B5563" strokeWidth="2" viewBox="0 0 24 24" style={{ flexShrink: 0, marginTop: "1px" }}>
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M11.25 11.25l.041-.02a.75.75 0 011.063.852l-.708 2.836a.75.75 0 001.063.853l.041-.021M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9-3.75h.008v.008H12V8.25z" />
                                </svg>
                                <span style={{ fontSize: "11px", color: "#4B5563", fontFamily: "monospace", lineHeight: 1.5 }}>
                                    {dialect === "postgresql" && "postgresql://postgres:pass@db.neon.tech:5432/main?sslmode=require"}
                                    {dialect === "mysql" && "mysql://root:pass@mysql.railway.app:3306/mydb"}
                                    {dialect === "sqlite" && "file:/absolute/path/to/database.sqlite"}
                                </span>
                            </div>
                        </div>

                        {/* Actions */}
                        <div style={{
                            display: "flex", justifyContent: "flex-end", gap: "10px",
                            paddingTop: "16px", borderTop: "1px solid rgba(255,255,255,0.06)",
                        }}>
                            {dbConnected && (
                                <button
                                    type="button"
                                    onClick={onClose}
                                    disabled={submitting || success}
                                    style={{
                                        padding: "9px 20px", borderRadius: "9px",
                                        background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)",
                                        color: "#9CA3AF", fontSize: "13px", fontWeight: 600, cursor: "pointer",
                                        transition: "all 0.15s",
                                    }}
                                    onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = "#fff"; (e.currentTarget as HTMLElement).style.background = "rgba(255,255,255,0.07)"; }}
                                    onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = "#9CA3AF"; (e.currentTarget as HTMLElement).style.background = "rgba(255,255,255,0.04)"; }}
                                >
                                    Cancel
                                </button>
                            )}
                            <button
                                type="submit"
                                disabled={submitting || success}
                                style={{
                                    padding: "9px 22px", borderRadius: "9px",
                                    background: submitting || success
                                        ? "rgba(99,102,241,0.4)"
                                        : "linear-gradient(135deg,#6366f1,#8b5cf6)",
                                    border: "none", color: "#fff",
                                    fontSize: "13px", fontWeight: 700,
                                    cursor: submitting || success ? "not-allowed" : "pointer",
                                    display: "flex", alignItems: "center", gap: "8px",
                                    boxShadow: submitting || success ? "none" : "0 4px 14px rgba(99,102,241,0.35)",
                                    transition: "filter 0.15s",
                                    minWidth: "160px", justifyContent: "center",
                                }}
                                onMouseEnter={e => { if (!submitting && !success) (e.currentTarget as HTMLElement).style.filter = "brightness(1.1)"; }}
                                onMouseLeave={e => (e.currentTarget as HTMLElement).style.filter = "none"}
                            >
                                {submitting ? (
                                    <>
                                        <div style={{
                                            width: "14px", height: "14px", flexShrink: 0,
                                            border: "2px solid rgba(255,255,255,0.25)",
                                            borderTop: "2px solid #fff",
                                            borderRadius: "50%", animation: "spin 0.7s linear infinite",
                                        }} />
                                        Testing connection…
                                    </>
                                ) : success ? (
                                    <>
                                        <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                                        </svg>
                                        Connected!
                                    </>
                                ) : (
                                    <>
                                        <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" d="M13.19 8.688a4.5 4.5 0 011.242 7.244l-4.5 4.5a4.5 4.5 0 01-6.364-6.364l1.757-1.757m13.35-.622l1.757-1.757a4.5 4.5 0 00-6.364-6.364l-4.5 4.5a4.5 4.5 0 001.242 7.244" />
                                        </svg>
                                        Connect Database
                                    </>
                                )}
                            </button>
                        </div>
                    </form>
                </div>
            </div>

            <style>{`
                @keyframes modalIn {
                    from { opacity: 0; transform: scale(0.96) translateY(8px); }
                    to   { opacity: 1; transform: scale(1)    translateY(0);    }
                }
                @keyframes spin {
                    to { transform: rotate(360deg); }
                }
            `}</style>
        </>
    );
}
