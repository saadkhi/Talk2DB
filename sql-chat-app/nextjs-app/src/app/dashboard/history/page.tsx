"use client";
import React, { useEffect, useState } from "react";

interface Message {
    id: string;
    role: "user" | "assistant";
    content: string;
    createdAt: string;
}

interface Conversation {
    id: string;
    title: string;
    updatedAt: string;
    createdAt: string;
    messages?: Message[];
}

function timeAgo(iso: string) {
    const diff = Date.now() - new Date(iso).getTime();
    const m = Math.floor(diff / 60000);
    if (m < 1) return "just now";
    if (m < 60) return `${m}m ago`;
    const h = Math.floor(m / 60);
    if (h < 24) return `${h}h ago`;
    const d = Math.floor(h / 24);
    if (d < 30) return `${d}d ago`;
    return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function fmtDate(iso: string) {
    return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric", hour: "2-digit", minute: "2-digit" });
}

export default function HistoryPage() {
    const [conversations, setConversations] = useState<Conversation[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [expanded, setExpanded] = useState<string | null>(null);
    const [loadingMsgs, setLoadingMsgs] = useState<string | null>(null);
    const [deleting, setDeleting] = useState<string | null>(null);
    const [search, setSearch] = useState("");

    const fetchConversations = async () => {
        setLoading(true);
        setError(null);
        try {
            const res = await fetch("/api/conversations");
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || "Failed to fetch history");
            setConversations(data);
        } catch (e: any) {
            setError(e.message);
        } finally {
            setLoading(false);
        }
    };

    const loadMessages = async (id: string) => {
        // Already loaded
        if (conversations.find(c => c.id === id)?.messages) {
            setExpanded(expanded === id ? null : id);
            return;
        }
        setLoadingMsgs(id);
        try {
            const res = await fetch(`/api/conversations/${id}`);
            const data = await res.json();
            if (!res.ok) throw new Error(data.error);
            setConversations(prev =>
                prev.map(c => c.id === id ? { ...c, messages: data.messages } : c)
            );
            setExpanded(id);
        } catch (e: any) {
            setError(e.message);
        } finally {
            setLoadingMsgs(null);
        }
    };

    const handleDelete = async (id: string) => {
        setDeleting(id);
        try {
            const res = await fetch(`/api/conversations/${id}`, { method: "DELETE" });
            if (!res.ok) { const d = await res.json(); throw new Error(d.error); }
            setConversations(prev => prev.filter(c => c.id !== id));
            if (expanded === id) setExpanded(null);
        } catch (e: any) {
            setError(e.message);
        } finally {
            setDeleting(null);
        }
    };

    useEffect(() => { fetchConversations(); }, []);

    const filtered = conversations.filter(c =>
        c.title.toLowerCase().includes(search.toLowerCase())
    );

    const card: React.CSSProperties = {
        background: "#0d0f1a",
        border: "1px solid rgba(255,255,255,0.08)",
        borderRadius: "14px",
        overflow: "hidden",
        transition: "border-color 0.15s",
    };

    return (
        <div style={{ maxWidth: "860px", margin: "0 auto", display: "flex", flexDirection: "column", gap: "24px" }}>

            {/* Header */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "12px" }}>
                <div>
                    <h1 style={{ fontSize: "22px", fontWeight: 800, color: "#fff", margin: "0 0 4px", letterSpacing: "-0.03em" }}>
                        Chat History
                    </h1>
                    <p style={{ fontSize: "13px", color: "#6B7280", margin: 0 }}>
                        All your past conversations with the AI assistant.
                    </p>
                </div>
                <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
                    <input
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                        placeholder="Search conversations…"
                        style={{
                            background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)",
                            borderRadius: "9px", padding: "8px 14px", fontSize: "12px",
                            color: "#fff", outline: "none", width: "220px",
                        }}
                    />
                    <button
                        onClick={fetchConversations}
                        style={{
                            background: "rgba(99,102,241,0.1)", border: "1px solid rgba(99,102,241,0.2)",
                            color: "#818cf8", borderRadius: "9px", padding: "8px 16px",
                            fontSize: "12px", fontWeight: 600, cursor: "pointer", display: "flex", alignItems: "center", gap: "6px",
                        }}
                    >
                        <svg width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99" />
                        </svg>
                        Refresh
                    </button>
                </div>
            </div>

            {/* Error */}
            {error && (
                <div style={{ background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.2)", borderRadius: "10px", padding: "12px 16px", fontSize: "12px", color: "#f87171" }}>
                    ⚠ {error}
                </div>
            )}

            {/* Loading */}
            {loading && (
                <div style={{ display: "flex", alignItems: "center", justifyContent: "center", padding: "60px 0", gap: "12px", color: "#6B7280", fontSize: "13px" }}>
                    <div style={{ width: "18px", height: "18px", border: "2px solid rgba(99,102,241,0.2)", borderTop: "2px solid #6366f1", borderRadius: "50%", animation: "spin 0.7s linear infinite" }} />
                    Loading history…
                </div>
            )}

            {/* Empty */}
            {!loading && !error && filtered.length === 0 && (
                <div style={{ ...card, padding: "48px 24px", textAlign: "center" }}>
                    <div style={{ width: "48px", height: "48px", borderRadius: "14px", background: "rgba(99,102,241,0.1)", border: "1px solid rgba(99,102,241,0.15)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 14px" }}>
                        <svg width="22" height="22" fill="none" stroke="#6366f1" strokeWidth="2" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                    </div>
                    <h3 style={{ fontSize: "15px", fontWeight: 700, color: "#fff", margin: "0 0 6px" }}>
                        {search ? "No conversations match your search" : "No conversations yet"}
                    </h3>
                    <p style={{ fontSize: "12px", color: "#6B7280", margin: 0 }}>
                        Start chatting with your database to see history here.
                    </p>
                </div>
            )}

            {/* Conversation list */}
            {!loading && filtered.map(conv => {
                const isExpanded = expanded === conv.id;
                const isLoadingThis = loadingMsgs === conv.id;
                const isDeletingThis = deleting === conv.id;

                return (
                    <div key={conv.id} style={card}
                        onMouseEnter={e => (e.currentTarget as HTMLElement).style.borderColor = "rgba(99,102,241,0.25)"}
                        onMouseLeave={e => (e.currentTarget as HTMLElement).style.borderColor = "rgba(255,255,255,0.08)"}
                    >
                        {/* Conversation header row */}
                        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "16px 20px", gap: "12px" }}>
                            <div style={{ flex: 1, minWidth: 0, cursor: "pointer" }} onClick={() => loadMessages(conv.id)}>
                                <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "3px" }}>
                                    <div style={{ width: "7px", height: "7px", borderRadius: "50%", background: "#6366f1", flexShrink: 0 }} />
                                    <h3 style={{ fontSize: "14px", fontWeight: 700, color: "#fff", margin: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                                        {conv.title}
                                    </h3>
                                </div>
                                <p style={{ fontSize: "11px", color: "#4B5563", margin: 0, paddingLeft: "15px" }}>
                                    {fmtDate(conv.createdAt)} · Last active {timeAgo(conv.updatedAt)}
                                </p>
                            </div>

                            <div style={{ display: "flex", alignItems: "center", gap: "8px", flexShrink: 0 }}>
                                <button
                                    onClick={() => loadMessages(conv.id)}
                                    disabled={isLoadingThis}
                                    style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", color: "#9CA3AF", borderRadius: "7px", padding: "5px 12px", fontSize: "11px", fontWeight: 600, cursor: "pointer", minWidth: "76px", display: "flex", alignItems: "center", justifyContent: "center", gap: "5px" }}
                                >
                                    {isLoadingThis ? (
                                        <div style={{ width: "10px", height: "10px", border: "2px solid rgba(255,255,255,0.2)", borderTop: "2px solid #fff", borderRadius: "50%", animation: "spin 0.7s linear infinite" }} />
                                    ) : isExpanded ? "Collapse" : "View"}
                                </button>
                                <button
                                    onClick={() => handleDelete(conv.id)}
                                    disabled={isDeletingThis}
                                    style={{ background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.15)", color: "#f87171", borderRadius: "7px", padding: "5px 10px", fontSize: "11px", cursor: "pointer", display: "flex", alignItems: "center", gap: "4px" }}
                                >
                                    <svg width="11" height="11" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
                                    </svg>
                                    {isDeletingThis ? "…" : "Delete"}
                                </button>
                            </div>
                        </div>

                        {/* Messages thread */}
                        {isExpanded && conv.messages && (
                            <div style={{ borderTop: "1px solid rgba(255,255,255,0.06)", padding: "16px 20px", display: "flex", flexDirection: "column", gap: "12px", maxHeight: "480px", overflowY: "auto" }}>
                                {conv.messages.length === 0 && (
                                    <p style={{ fontSize: "12px", color: "#4B5563", textAlign: "center", padding: "20px 0" }}>No messages in this conversation.</p>
                                )}
                                {conv.messages.map(msg => (
                                    <div key={msg.id} style={{ display: "flex", flexDirection: "column", alignItems: msg.role === "user" ? "flex-end" : "flex-start", gap: "4px" }}>
                                        <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                                            <div style={{
                                                width: "18px", height: "18px", borderRadius: "50%", flexShrink: 0,
                                                background: msg.role === "user" ? "linear-gradient(135deg,#6366f1,#8b5cf6)" : "rgba(255,255,255,0.08)",
                                                display: "flex", alignItems: "center", justifyContent: "center",
                                            }}>
                                                {msg.role === "user"
                                                    ? <svg width="9" height="9" fill="white" viewBox="0 0 24 24"><path d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0" stroke="white" strokeWidth="1.5" fill="none" /></svg>
                                                    : <svg width="9" height="9" fill="none" stroke="#818cf8" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" /></svg>
                                                }
                                            </div>
                                            <span style={{ fontSize: "10px", fontWeight: 700, color: msg.role === "user" ? "#818cf8" : "#6B7280", textTransform: "uppercase", letterSpacing: "0.08em" }}>
                                                {msg.role === "user" ? "You" : "AI"}
                                            </span>
                                            <span style={{ fontSize: "10px", color: "#374151" }}>{timeAgo(msg.createdAt)}</span>
                                        </div>
                                        <div style={{
                                            maxWidth: "80%",
                                            padding: "10px 14px",
                                            borderRadius: msg.role === "user" ? "12px 12px 4px 12px" : "12px 12px 12px 4px",
                                            background: msg.role === "user" ? "rgba(99,102,241,0.12)" : "rgba(255,255,255,0.04)",
                                            border: msg.role === "user" ? "1px solid rgba(99,102,241,0.2)" : "1px solid rgba(255,255,255,0.06)",
                                            fontSize: "12px", color: "#D1D5DB", lineHeight: 1.65,
                                            whiteSpace: "pre-wrap", wordBreak: "break-word",
                                        }}>
                                            {msg.content}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                );
            })}

            <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        </div>
    );
}
