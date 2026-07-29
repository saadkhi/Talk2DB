"use client";
import React, { useState, useRef, useEffect } from "react";
import DataTable from "@/components/data/DataTable";
import SQLEditor from "@/components/SQLEditor";

const EXAMPLES = [
    "Show the top 10 most recent users",
    "List all conversations with their message counts",
    "Find users who joined in the last 30 days",
    "Count total saved reports per user",
];

// ── tiny helpers ──────────────────────────────────────────────────────────────
function Spinner({ size = 14, color = "#fff" }: { size?: number; color?: string }) {
    return (
        <div style={{
            width: size, height: size,
            border: `2px solid rgba(255,255,255,0.2)`,
            borderTop: `2px solid ${color}`,
            borderRadius: "50%",
            animation: "spin 0.7s linear infinite",
            flexShrink: 0,
        }} />
    );
}

const card: React.CSSProperties = {
    background: "#0d0f1a",
    border: "1px solid rgba(255,255,255,0.08)",
    borderRadius: "14px",
};

const labelStyle: React.CSSProperties = {
    fontSize: "11px", fontWeight: 700, color: "#6B7280",
    textTransform: "uppercase", letterSpacing: "0.08em",
};

// ── page ──────────────────────────────────────────────────────────────────────
export default function QueryStudioPage() {
    const [prompt, setPrompt]           = useState("");
    const [generatedSql, setGeneratedSql] = useState("");
    const [editedSql, setEditedSql]     = useState("");

    const [generating, setGenerating]   = useState(false);
    const [running, setRunning]         = useState(false);

    const [columns, setColumns]         = useState<string[]>([]);
    const [rows, setRows]               = useState<any[]>([]);
    const [rowError, setRowError]       = useState<string | null>(null);
    const [genError, setGenError]       = useState<string | null>(null);
    const [hasResult, setHasResult]     = useState(false);
    const [copied, setCopied]           = useState(false);

    const resultsRef = useRef<HTMLDivElement>(null);

    // keep edit box in sync when AI returns new SQL
    useEffect(() => { setEditedSql(generatedSql); }, [generatedSql]);

    // scroll to results after execution
    useEffect(() => {
        if (hasResult) resultsRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, [hasResult]);

    // ── step 1: generate SQL ──────────────────────────────────────────────
    const generateSQL = async (q: string) => {
        const trimmed = q.trim();
        if (!trimmed) return;
        setGenerating(true);
        setGenError(null);
        setGeneratedSql("");
        setColumns([]); setRows([]);
        setHasResult(false); setRowError(null);
        try {
            const res  = await fetch("/api/query", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ prompt: trimmed }),
                signal: AbortSignal.timeout(125000),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || "Generation failed");
            setGeneratedSql(data.sql ?? "");
        } catch (e: any) {
            setGenError(e.message);
        } finally {
            setGenerating(false);
        }
    };

    // ── step 2: execute SQL ───────────────────────────────────────────────
    const runSQL = async () => {
        const sql = editedSql.trim();
        if (!sql) return;
        setRunning(true);
        setRowError(null); setColumns([]); setRows([]);
        setHasResult(false);
        try {
            const res  = await fetch("/api/query/run", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ sql }),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || "Execution failed");
            setColumns(data.columns ?? []);
            setRows(data.rows ?? []);
            setHasResult(true);
        } catch (e: any) {
            setRowError(e.message);
            setHasResult(true);
        } finally {
            setRunning(false);
        }
    };

    const handleCopy = () => {
        if (!editedSql) return;
        navigator.clipboard.writeText(editedSql);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    const isDirty = !!generatedSql && editedSql.trim() !== generatedSql.trim();

    return (
        <div style={{ display: "flex", flexDirection: "column", gap: "24px", maxWidth: "1100px", margin: "0 auto", width: "100%" }}>

            {/* ── page header ── */}
            <div>
                <h1 style={{ fontSize: "22px", fontWeight: 800, color: "#fff", margin: "0 0 4px", letterSpacing: "-0.03em" }}>
                    Query Studio
                </h1>
                <p style={{ fontSize: "13px", color: "#6B7280", margin: 0 }}>
                    Write in plain English — Talk2DB generates SQL on the right. Edit it, then hit Run.
                </p>
            </div>

            {/* ── two-panel row (always visible) ── */}
            <div style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: "16px",
                alignItems: "stretch",   /* both cards grow to the same height */
            }}>

                {/* ── LEFT: natural language prompt ── */}
                <div style={{ ...card, padding: "22px 24px", display: "flex", flexDirection: "column" }}>
                    <form
                        onSubmit={e => { e.preventDefault(); generateSQL(prompt); }}
                        style={{ display: "flex", flexDirection: "column", gap: "14px", flex: 1 }}
                    >
                        <label style={labelStyle}>Natural Language Prompt</label>

                        <div style={{ flex: 1, display: "flex", flexDirection: "column" }}>
                            <SQLEditor
                                value={prompt}
                                onChange={setPrompt}
                                placeholder="e.g. Show all employees who have salary less than 60000..."
                                disabled={generating}
                                minHeight={148}
                            />
                        </div>

                        {/* example chips */}
                        <div style={{ display: "flex", alignItems: "center", gap: "6px", flexWrap: "wrap" }}>
                            <span style={{ fontSize: "11px", color: "#4B5563", fontWeight: 600, marginRight: 2 }}>Try:</span>
                            {EXAMPLES.map(ex => (
                                <button
                                    key={ex} type="button" disabled={generating}
                                    onClick={() => { setPrompt(ex); generateSQL(ex); }}
                                    style={{
                                        fontSize: "11px", padding: "4px 11px", borderRadius: "20px",
                                        background: "rgba(99,102,241,0.08)", border: "1px solid rgba(99,102,241,0.2)",
                                        color: "#a5b4fc", cursor: generating ? "not-allowed" : "pointer", whiteSpace: "nowrap",
                                    }}
                                    onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = "rgba(99,102,241,0.18)"}
                                    onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = "rgba(99,102,241,0.08)"}
                                >
                                    {ex.length > 34 ? ex.slice(0, 34) + "…" : ex}
                                </button>
                            ))}
                        </div>

                        {/* generate button */}
                        <button
                            type="submit"
                            disabled={generating || !prompt.trim()}
                            style={{
                                padding: "11px", borderRadius: "10px", fontSize: "13px", fontWeight: 700,
                                background: (generating || !prompt.trim()) ? "rgba(99,102,241,0.3)" : "linear-gradient(135deg,#6366f1,#8b5cf6)",
                                color: "#fff", border: "none",
                                cursor: (generating || !prompt.trim()) ? "not-allowed" : "pointer",
                                boxShadow: (generating || !prompt.trim()) ? "none" : "0 4px 14px rgba(99,102,241,0.3)",
                                display: "flex", alignItems: "center", justifyContent: "center", gap: "8px",
                            }}
                            onMouseEnter={e => { if (!generating) (e.currentTarget as HTMLElement).style.filter = "brightness(1.12)"; }}
                            onMouseLeave={e => (e.currentTarget as HTMLElement).style.filter = "none"}
                        >
                            {generating && <Spinner />}
                            {generating ? "Generating SQL…" : "Generate SQL →"}
                        </button>

                        {/* generation error */}
                        {genError && (
                            <div style={{ background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.2)", borderRadius: "10px", padding: "12px 14px" }}>
                                <p style={{ fontSize: "12px", fontWeight: 700, color: "#f87171", margin: "0 0 3px" }}>⚠ Generation Error</p>
                                <p style={{ fontSize: "12px", color: "#fca5a5", margin: 0 }}>{genError}</p>
                            </div>
                        )}
                    </form>
                </div>

                {/* ── RIGHT: editable SQL + run button ── */}
                <div style={{ ...card, padding: "22px 24px", display: "flex", flexDirection: "column", gap: "14px" }}>

                    {/* header */}
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "8px" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                            <span style={labelStyle}>Generated SQL</span>
                            {isDirty && (
                                <span style={{
                                    fontSize: "10px", fontWeight: 600, color: "#fbbf24",
                                    background: "rgba(251,191,36,0.1)", border: "1px solid rgba(251,191,36,0.2)",
                                    borderRadius: "6px", padding: "2px 7px",
                                }}>edited</span>
                            )}
                        </div>

                        <div style={{ display: "flex", gap: "6px" }}>
                            {isDirty && (
                                <button
                                    onClick={() => setEditedSql(generatedSql)}
                                    style={{
                                        fontSize: "11px", fontWeight: 600, padding: "4px 11px", borderRadius: "7px",
                                        background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)",
                                        color: "#9CA3AF", cursor: "pointer",
                                    }}
                                    onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = "rgba(255,255,255,0.09)"}
                                    onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = "rgba(255,255,255,0.04)"}
                                >↺ Reset</button>
                            )}
                            <button
                                onClick={handleCopy}
                                disabled={!editedSql}
                                style={{
                                    fontSize: "11px", fontWeight: 600, padding: "4px 11px", borderRadius: "7px",
                                    background: copied ? "rgba(16,185,129,0.12)" : "rgba(255,255,255,0.04)",
                                    border: copied ? "1px solid rgba(16,185,129,0.25)" : "1px solid rgba(255,255,255,0.08)",
                                    color: copied ? "#34d399" : "#9CA3AF",
                                    cursor: editedSql ? "pointer" : "not-allowed",
                                    display: "flex", alignItems: "center", gap: "4px",
                                }}
                            >
                                {copied
                                    ? <><svg width="11" height="11" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" /></svg>Copied</>
                                    : <><svg width="11" height="11" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><rect x="9" y="9" width="13" height="13" rx="2" /><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1" /></svg>Copy</>
                                }
                            </button>
                        </div>
                    </div>

                    {/* SQL editor — loading skeleton OR real editor */}
                    {generating ? (
                        <div style={{
                            flex: 1, minHeight: 148, borderRadius: "10px",
                            background: "#080a12", border: "1px solid rgba(255,255,255,0.06)",
                            display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
                            gap: "12px", color: "#4B5563",
                        }}>
                            <Spinner size={20} color="#818cf8" />
                            <span style={{ fontSize: "12px", fontWeight: 600 }}>Generating SQL…</span>
                        </div>
                    ) : (
                        <div style={{ flex: 1, display: "flex", flexDirection: "column" }}>
                            <SQLEditor
                                value={editedSql}
                                onChange={setEditedSql}
                                placeholder="SQL will appear here after you click Generate SQL →"
                                disabled={running}
                                minHeight={148}
                            />
                        </div>
                    )}

                    <p style={{ fontSize: "11px", color: "#374151", margin: 0 }}>
                        ✏️ Edit the SQL above if needed, then click Run.
                    </p>

                    {/* Run button */}
                    <button
                        onClick={runSQL}
                        disabled={running || !editedSql.trim()}
                        style={{
                            width: "100%", padding: "12px", borderRadius: "10px",
                            fontSize: "14px", fontWeight: 700,
                            background: (running || !editedSql.trim())
                                ? "rgba(16,185,129,0.25)"
                                : "linear-gradient(135deg,#10b981,#059669)",
                            color: "#fff", border: "none",
                            cursor: (running || !editedSql.trim()) ? "not-allowed" : "pointer",
                            boxShadow: (running || !editedSql.trim()) ? "none" : "0 4px 14px rgba(16,185,129,0.3)",
                            display: "flex", alignItems: "center", justifyContent: "center", gap: "8px",
                        }}
                        onMouseEnter={e => { if (!running && editedSql.trim()) (e.currentTarget as HTMLElement).style.filter = "brightness(1.1)"; }}
                        onMouseLeave={e => (e.currentTarget as HTMLElement).style.filter = "none"}
                    >
                        {running && <Spinner />}
                        {running
                            ? "Running…"
                            : <><svg width="14" height="14" fill="currentColor" viewBox="0 0 24 24" style={{ flexShrink: 0 }}><polygon points="5 3 19 12 5 21 5 3" /></svg>Run Query</>
                        }
                    </button>
                </div>
            </div>

            {/* ── results table (always below both panels) ── */}
            {hasResult && (
                <div ref={resultsRef} style={{ animation: "fadeUp 0.25s ease" }}>
                    {rowError ? (
                        <div style={{ background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.2)", borderRadius: "12px", padding: "14px 16px" }}>
                            <p style={{ fontSize: "12px", fontWeight: 700, color: "#f87171", margin: "0 0 3px" }}>⚠ Execution Error</p>
                            <p style={{ fontSize: "12px", color: "#fca5a5", margin: 0, fontFamily: "monospace", wordBreak: "break-word" }}>{rowError}</p>
                        </div>
                    ) : (
                        <div style={{ ...card, padding: "20px 22px" }}>
                            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "14px", paddingBottom: "12px", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
                                <span style={labelStyle}>Results</span>
                                <span style={{ fontSize: "11px", color: "#4B5563", fontWeight: 600 }}>
                                    {rows.length.toLocaleString()} row{rows.length !== 1 ? "s" : ""} returned
                                </span>
                            </div>
                            {rows.length === 0
                                ? <p style={{ fontSize: "13px", color: "#6B7280", margin: 0 }}>Query executed successfully — no rows returned.</p>
                                : <DataTable columns={columns} rows={rows} pageSize={20} />
                            }
                        </div>
                    )}
                </div>
            )}

            <style>{`
                @keyframes spin    { to { transform: rotate(360deg); } }
                @keyframes fadeUp  { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: none; } }
            `}</style>
        </div>
    );
}
