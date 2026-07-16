"use client";
import React, { useState } from "react";
import DataTable from "@/components/data/DataTable";

const EXAMPLES = [
    "Show the top 10 most recent users",
    "List all conversations with their message counts",
    "Find users who joined in the last 30 days",
    "Count total saved reports per user",
];

const S = {
    page: { display: "flex", flexDirection: "column" as const, gap: "24px", maxWidth: "1100px", margin: "0 auto", width: "100%" },
    card: { background: "#0d0f1a", border: "1px solid rgba(255,255,255,0.08)", borderRadius: "14px" },
    label: { fontSize: "11px", fontWeight: 700, color: "#6B7280", textTransform: "uppercase" as const, letterSpacing: "0.08em" },
    heading: { fontSize: "22px", fontWeight: 800, color: "#fff", margin: "0 0 4px", letterSpacing: "-0.03em" },
    subheading: { fontSize: "13px", color: "#6B7280", margin: 0 },
    errorBox: { background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.2)", borderRadius: "12px", padding: "14px 16px" },
};

export default function QueryStudioPage() {
    const [prompt, setPrompt] = useState("");
    const [loading, setLoading] = useState(false);
    const [sql, setSql] = useState<string | null>(null);
    const [columns, setColumns] = useState<string[]>([]);
    const [rows, setRows] = useState<any[]>([]);
    const [error, setError] = useState<string | null>(null);
    const [copied, setCopied] = useState(false);

    const runQuery = async (q: string) => {
        if (!q.trim()) return;
        setLoading(true); setError(null); setSql(null); setColumns([]); setRows([]);
        try {
            const res = await fetch("/api/query", {
                method: "POST", headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ prompt: q }),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || "Query failed");
            setSql(data.sql); setColumns(data.columns || []); setRows(data.rows || []);
        } catch (e: any) { setError(e.message); }
        finally { setLoading(false); }
    };

    const handleCopy = () => {
        if (!sql) return;
        navigator.clipboard.writeText(sql);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    return (
        <div style={S.page}>
            {/* Header */}
            <div>
                <h1 style={S.heading}>Query Studio</h1>
                <p style={S.subheading}>Write in plain English — Talk2DB translates to safe SQL and runs it instantly.</p>
            </div>

            {/* Input card */}
            <div style={{ ...S.card, padding: "22px 24px" }}>
                <form onSubmit={e => { e.preventDefault(); runQuery(prompt); }} style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
                    <label style={S.label}>Natural Language Prompt</label>
                    <textarea
                        value={prompt}
                        onChange={e => setPrompt(e.target.value)}
                        placeholder="e.g. Find all users who joined this month and show their email and created date..."
                        disabled={loading}
                        required
                        rows={4}
                        style={{
                            background: "#080a12", border: "1px solid rgba(255,255,255,0.08)",
                            color: "#fff", padding: "14px 16px", borderRadius: "10px",
                            fontSize: "14px", fontFamily: "inherit", lineHeight: 1.65,
                            resize: "vertical", outline: "none", transition: "border-color 0.15s",
                            width: "100%", boxSizing: "border-box",
                        }}
                        onFocus={e => (e.currentTarget.style.borderColor = "#6366f1")}
                        onBlur={e => (e.currentTarget.style.borderColor = "rgba(255,255,255,0.08)")}
                    />

                    {/* Example chips + submit */}
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "10px" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
                            <span style={{ fontSize: "11px", color: "#4B5563", fontWeight: 600 }}>Try:</span>
                            {EXAMPLES.map(ex => (
                                <button key={ex} type="button"
                                    disabled={loading}
                                    onClick={() => { setPrompt(ex); runQuery(ex); }}
                                    style={{
                                        fontSize: "11px", padding: "5px 12px", borderRadius: "20px",
                                        background: "rgba(99,102,241,0.08)", border: "1px solid rgba(99,102,241,0.2)",
                                        color: "#a5b4fc", cursor: "pointer", transition: "all 0.15s", whiteSpace: "nowrap",
                                    }}
                                    onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = "rgba(99,102,241,0.15)"}
                                    onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = "rgba(99,102,241,0.08)"}
                                >
                                    {ex.length > 38 ? ex.slice(0, 38) + "…" : ex}
                                </button>
                            ))}
                        </div>
                        <button type="submit" disabled={loading} style={{
                            padding: "10px 28px", borderRadius: "10px", fontSize: "13px", fontWeight: 700,
                            background: loading ? "rgba(99,102,241,0.4)" : "linear-gradient(135deg,#6366f1,#8b5cf6)",
                            color: "#fff", border: "none", cursor: loading ? "not-allowed" : "pointer",
                            boxShadow: loading ? "none" : "0 4px 14px rgba(99,102,241,0.3)", transition: "filter 0.15s",
                            display: "flex", alignItems: "center", gap: "8px",
                        }}
                            onMouseEnter={e => { if (!loading) (e.currentTarget as HTMLElement).style.filter = "brightness(1.1)"; }}
                            onMouseLeave={e => (e.currentTarget as HTMLElement).style.filter = "none"}
                        >
                            {loading && <div style={{ width: "14px", height: "14px", border: "2px solid rgba(255,255,255,0.3)", borderTop: "2px solid #fff", borderRadius: "50%", animation: "spin 0.7s linear infinite" }} />}
                            {loading ? "Running…" : "Execute Query"}
                        </button>
                    </div>
                </form>
            </div>

            {/* Error */}
            {error && (
                <div style={S.errorBox}>
                    <p style={{ fontSize: "12px", fontWeight: 700, color: "#f87171", margin: "0 0 4px" }}>⚠ Query Error</p>
                    <p style={{ fontSize: "12px", color: "#fca5a5", margin: 0 }}>{error}</p>
                </div>
            )}

            {/* Generated SQL */}
            {sql && (
                <div style={{ ...S.card, padding: "20px 22px" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px", paddingBottom: "12px", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
                        <span style={{ ...S.label }}>Generated SQL</span>
                        <button onClick={handleCopy} style={{
                            fontSize: "11px", fontWeight: 600, padding: "5px 14px", borderRadius: "7px",
                            background: copied ? "rgba(16,185,129,0.12)" : "rgba(255,255,255,0.05)",
                            border: copied ? "1px solid rgba(16,185,129,0.25)" : "1px solid rgba(255,255,255,0.1)",
                            color: copied ? "#34d399" : "#9CA3AF", cursor: "pointer", transition: "all 0.15s",
                            display: "flex", alignItems: "center", gap: "5px",
                        }}>
                            {copied
                                ? <><svg width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" /></svg>Copied</>
                                : <><svg width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M15.666 3.888A2.25 2.25 0 0013.5 2.25h-3c-1.03 0-1.9.693-2.166 1.638m7.332 0c.055.194.084.4.084.612v0a.75.75 0 01-.75.75H9a.75.75 0 01-.75-.75v0c0-.212.03-.418.084-.612m7.332 0c.646.049 1.288.11 1.927.184 1.1.128 1.907 1.077 1.907 2.185V19.5a2.25 2.25 0 01-2.25 2.25H6.75A2.25 2.25 0 014.5 19.5V6.257c0-1.108.806-2.057 1.907-2.185a48.208 48.208 0 011.927-.184" /></svg>Copy SQL</>
                            }
                        </button>
                    </div>
                    <pre style={{
                        background: "#080a12", border: "1px solid rgba(255,255,255,0.06)",
                        borderRadius: "10px", padding: "16px", margin: 0,
                        fontSize: "12px", fontFamily: "'Geist Mono', monospace", color: "#818cf8",
                        overflowX: "auto", whiteSpace: "pre-wrap", lineHeight: 1.75,
                    }}>{sql}</pre>
                </div>
            )}

            {/* Results */}
            {rows.length > 0 && (
                <div style={{ ...S.card, padding: "20px 22px" }}>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "16px", paddingBottom: "12px", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
                        <span style={S.label}>Results</span>
                        <span style={{ fontSize: "11px", color: "#4B5563", fontWeight: 600 }}>{rows.length.toLocaleString()} row{rows.length !== 1 ? "s" : ""} returned</span>
                    </div>
                    <DataTable columns={columns} rows={rows} pageSize={20} />
                </div>
            )}

            <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        </div>
    );
}
