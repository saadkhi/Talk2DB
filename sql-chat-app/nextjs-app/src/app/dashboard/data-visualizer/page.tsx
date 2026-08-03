"use client";
import React, { useState, useEffect } from "react";
import ChartRenderer from "@/components/data/ChartRenderer";
import DataTable from "@/components/data/DataTable";
import { usePageState } from "@/context/PageStateContext";

const card = { background: "#0d0f1a", border: "1px solid rgba(255,255,255,0.08)", borderRadius: "14px" };
const lbl  = { fontSize: "10px", fontWeight: 700, color: "#6B7280", textTransform: "uppercase" as const, letterSpacing: "0.08em" };

/* ── Available chart types ── */
const CHART_TYPES = [
    { id: "bar",  label: "Bar Chart",   desc: "Compare values across categories",     icon: "▬" },
    { id: "line", label: "Line Chart",  desc: "Show trends over time",                icon: "∿" },
    { id: "pie",  label: "Pie Chart",   desc: "Show proportions of a whole",           icon: "◑" },
    { id: "area", label: "Area Chart",  desc: "Filled line chart for volume/trends",   icon: "▲" },
];

interface SchemaTable { name: string; rowCount: number; columns: { name: string; type: string }[] }

export default function DataVisualizerPage() {
    const { visualizer: s, setVisualizer: set } = usePageState();
    const { prompt, result, error } = s;
    const setPrompt = (v: string) => set({ prompt: v });
    const setResult = (v: typeof result) => set({ result: v });
    const setError  = (v: string | null) => set({ error: v });

    const [loading, setLoading] = useState(false);

    // schema state — full table+columns info
    const [schemaTables, setSchemaTables] = useState<SchemaTable[]>([]);
    const [selectedTable, setSelectedTable] = useState<SchemaTable | null>(null);
    const [selectedChart, setSelectedChart] = useState<string | null>(null);

    useEffect(() => {
        fetch("/api/schema")
            .then(r => r.json())
            .then(d => {
                if (d.tables) {
                    setSchemaTables(d.tables);
                    if (d.tables.length) setSelectedTable(d.tables[0]);
                }
            })
            .catch(() => {});
    }, []);

    // When user clicks a table or chart type, insert a hint into the prompt
    const insertTableHint = (t: SchemaTable) => {
        setSelectedTable(t);
        // Don't overwrite an existing custom prompt — just select, user can reference
    };

    const buildPromptHint = () => {
        const parts: string[] = [];
        if (selectedChart) parts.push(CHART_TYPES.find(c => c.id === selectedChart)?.label ?? "");
        if (selectedTable) parts.push(`using ${selectedTable.name} table`);
        return parts.join(" ");
    };

    const run = async (q: string) => {
        if (!q.trim()) return;
        setLoading(true); setError(null); setResult(null);
        try {
            const res = await fetch("/api/visualize", {
                method: "POST", headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ prompt: q }),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || "Visualization failed");
            setResult(data);
        } catch (e: any) { setError(e.message); }
        finally { setLoading(false); }
    };

    return (
        <div style={{ display: "flex", flexDirection: "column", gap: "20px", maxWidth: "1300px", margin: "0 auto", width: "100%" }}>
            {/* Header */}
            <div>
                <h1 style={{ fontSize: "22px", fontWeight: 800, color: "#fff", margin: "0 0 4px", letterSpacing: "-0.03em" }}>Data Visualizer</h1>
                <p style={{ fontSize: "13px", color: "#6B7280", margin: 0 }}>Choose a table and chart type, describe what you want — Talk2DB generates the SQL and renders it.</p>
            </div>

            {/* ── Main 3-col layout: Tables | Prompt | Charts ── */}
            <div style={{ display: "grid", gridTemplateColumns: "220px 1fr 200px", gap: "14px", alignItems: "start" }}>

                {/* ── LEFT: Tables + Columns ── */}
                <div style={{ ...card, padding: "14px", display: "flex", flexDirection: "column", gap: "10px", position: "sticky", top: "72px", maxHeight: "calc(100vh - 140px)", overflow: "hidden" }}>
                    <p style={{ ...lbl, margin: 0, paddingBottom: "8px", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
                        Tables {schemaTables.length > 0 && `(${schemaTables.length})`}
                    </p>

                    {/* Table list */}
                    <div style={{ display: "flex", flexDirection: "column", gap: "2px", overflowY: "auto", maxHeight: "180px" }}>
                        {schemaTables.length === 0 && (
                            <p style={{ fontSize: "11px", color: "#374151", margin: 0 }}>No database connected</p>
                        )}
                        {schemaTables.map(t => {
                            const active = selectedTable?.name === t.name;
                            return (
                                <button key={t.name} onClick={() => insertTableHint(t)} style={{
                                    display: "flex", alignItems: "center", gap: "6px", padding: "7px 9px",
                                    borderRadius: "7px", border: active ? "1px solid rgba(59,130,246,0.4)" : "1px solid transparent",
                                    background: active ? "rgba(59,130,246,0.12)" : "transparent",
                                    cursor: "pointer", textAlign: "left", width: "100%", transition: "background 0.12s",
                                }}
                                    onMouseEnter={e => { if (!active) (e.currentTarget as HTMLElement).style.background = "rgba(255,255,255,0.04)"; }}
                                    onMouseLeave={e => { if (!active) (e.currentTarget as HTMLElement).style.background = "transparent"; }}
                                >
                                    <svg width="10" height="10" fill="none" stroke={active ? "#60a5fa" : "#4B5563"} strokeWidth="2" viewBox="0 0 24 24" style={{ flexShrink: 0 }}>
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M20.25 6.375c0 2.278-3.694 4.125-8.25 4.125S3.75 8.653 3.75 6.375m16.5 0c0-2.278-3.694-4.125-8.25-4.125S3.75 4.097 3.75 6.375m16.5 0v11.25c0 2.278-3.694 4.125-8.25 4.125s-8.25-1.847-8.25-4.125V6.375m16.5 2.625c0 2.278-3.694 4.125-8.25 4.125s-8.25-1.847-8.25-4.125" />
                                    </svg>
                                    <span style={{ fontSize: "12px", fontFamily: "monospace", fontWeight: active ? 700 : 400, color: active ? "#93c5fd" : "#9CA3AF", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", flex: 1 }}>{t.name}</span>
                                    <span style={{ fontSize: "9px", color: "#374151", flexShrink: 0 }}>{t.rowCount.toLocaleString()}</span>
                                </button>
                            );
                        })}
                    </div>

                    {/* Columns of selected table */}
                    {selectedTable && selectedTable.columns.length > 0 && (
                        <>
                            <div style={{ borderTop: "1px solid rgba(255,255,255,0.06)", paddingTop: "8px" }}>
                                <p style={{ ...lbl, margin: "0 0 6px", fontSize: "9px" }}>
                                    {selectedTable.name} columns
                                </p>
                                <div style={{ display: "flex", flexDirection: "column", gap: "2px", overflowY: "auto", maxHeight: "260px" }}>
                                    {selectedTable.columns.map(col => (
                                        <div key={col.name} style={{
                                            display: "flex", alignItems: "center", justifyContent: "space-between",
                                            padding: "4px 6px", borderRadius: "5px",
                                            cursor: "pointer", transition: "background 0.1s",
                                        }}
                                            onClick={() => {
                                                // Insert column name into prompt at cursor
                                                setPrompt(prompt ? `${prompt} ${col.name}` : col.name);
                                            }}
                                            onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = "rgba(255,255,255,0.04)"}
                                            onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = "transparent"}
                                            title={`Click to add "${col.name}" to prompt`}
                                        >
                                            <span style={{ fontSize: "11px", fontFamily: "monospace", color: "#D1D5DB", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{col.name}</span>
                                            <span style={{ fontSize: "9px", color: "#4B5563", marginLeft: "6px", flexShrink: 0, fontFamily: "monospace" }}>{col.type.replace("character varying", "varchar").replace("timestamp without time zone", "timestamp")}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                            <p style={{ fontSize: "10px", color: "#374151", margin: "2px 0 0", lineHeight: 1.4 }}>
                                Click a column to add it to your prompt.
                            </p>
                        </>
                    )}
                </div>

                {/* ── MIDDLE: Prompt + results ── */}
                <div style={{ display: "flex", flexDirection: "column", gap: "14px", minWidth: 0 }}>
                    <div style={{ ...card, padding: "20px 22px" }}>
                        <form onSubmit={e => { e.preventDefault(); run(prompt); }} style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "8px" }}>
                                <label style={lbl}>Visualization Request</label>
                                {(selectedTable || selectedChart) && (
                                    <button type="button" onClick={() => setPrompt(buildPromptHint())}
                                        style={{ fontSize: "10px", padding: "3px 10px", borderRadius: "20px", background: "rgba(59,130,246,0.1)", border: "1px solid rgba(59,130,246,0.25)", color: "#93c5fd", cursor: "pointer" }}>
                                        ← Use {[selectedChart ? CHART_TYPES.find(c=>c.id===selectedChart)?.label : null, selectedTable?.name].filter(Boolean).join(" · ")}
                                    </button>
                                )}
                            </div>
                            <textarea
                                value={prompt} onChange={e => setPrompt(e.target.value)}
                                placeholder="e.g. Pie chart of male vs female students aged 15, using students table…"
                                disabled={loading} required rows={4}
                                style={{
                                    background: "#080a12", border: "1px solid rgba(255,255,255,0.08)",
                                    color: "#fff", padding: "14px 16px", borderRadius: "10px",
                                    fontSize: "13px", fontFamily: "inherit", lineHeight: 1.65,
                                    resize: "vertical", outline: "none", transition: "border-color 0.15s",
                                    width: "100%", boxSizing: "border-box",
                                }}
                                onFocus={e => (e.currentTarget.style.borderColor = "#3b82f6")}
                                onBlur={e => (e.currentTarget.style.borderColor = "rgba(255,255,255,0.08)")}
                            />
                            <div style={{ display: "flex", justifyContent: "flex-end" }}>
                                <button type="submit" disabled={loading || !prompt.trim()} style={{
                                    padding: "10px 28px", borderRadius: "10px", fontSize: "13px", fontWeight: 700,
                                    background: loading || !prompt.trim() ? "rgba(59,130,246,0.35)" : "linear-gradient(135deg,#3b82f6,#6366f1)",
                                    color: "#fff", border: "none", cursor: loading || !prompt.trim() ? "not-allowed" : "pointer",
                                    boxShadow: loading || !prompt.trim() ? "none" : "0 4px 14px rgba(59,130,246,0.3)",
                                    display: "flex", alignItems: "center", gap: "8px",
                                }}>
                                    {loading && <div style={{ width: "14px", height: "14px", border: "2px solid rgba(255,255,255,0.3)", borderTop: "2px solid #fff", borderRadius: "50%", animation: "spin 0.7s linear infinite" }} />}
                                    {loading ? "Rendering…" : "Render Chart"}
                                </button>
                            </div>
                        </form>
                    </div>

                    {/* Error */}
                    {error && (
                        <div style={{ background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.2)", borderRadius: "12px", padding: "14px 16px" }}>
                            <p style={{ fontSize: "12px", fontWeight: 700, color: "#f87171", margin: "0 0 4px" }}>⚠ Visualization Error</p>
                            <p style={{ fontSize: "12px", color: "#fca5a5", margin: 0 }}>{error}</p>
                        </div>
                    )}

                    {/* Chart output */}
                    {result && (
                        <>
                            <div style={{ ...card, padding: "24px" }}>
                                <ChartRenderer chartType={result.chartType} data={result.data} xKey={result.xKey} yKeys={result.yKeys} title={result.title} />
                            </div>
                            <details style={{ ...card, padding: "14px 20px", cursor: "pointer" }}>
                                <summary style={{ ...lbl, outline: "none", userSelect: "none", display: "flex", justifyContent: "space-between", alignItems: "center", cursor: "pointer" }}>
                                    <span>Generated SQL</span>
                                    <svg width="12" height="12" fill="none" stroke="#6366f1" strokeWidth="2.5" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" /></svg>
                                </summary>
                                <pre style={{ margin: "12px 0 0", padding: "14px", background: "#080a12", borderRadius: "8px", border: "1px solid rgba(255,255,255,0.06)", fontSize: "11px", fontFamily: "monospace", color: "#818cf8", overflowX: "auto", whiteSpace: "pre-wrap", lineHeight: 1.7 }}>{result.sql}</pre>
                            </details>
                            {result.data.length > 0 && (
                                <div style={{ ...card, padding: "20px 22px" }}>
                                    <p style={{ ...lbl, margin: "0 0 14px", paddingBottom: "10px", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
                                        Underlying Data — {result.data.length} records
                                    </p>
                                    <DataTable columns={result.columns} rows={result.data} pageSize={10} />
                                </div>
                            )}
                        </>
                    )}
                </div>

                {/* ── RIGHT: Chart type list ── */}
                <div style={{ ...card, padding: "14px", position: "sticky", top: "72px" }}>
                    <p style={{ ...lbl, margin: "0 0 10px", paddingBottom: "8px", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>Chart Types</p>
                    <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                        {CHART_TYPES.map(ct => {
                            const active = selectedChart === ct.id;
                            return (
                                <button key={ct.id} onClick={() => setSelectedChart(active ? null : ct.id)} style={{
                                    display: "flex", alignItems: "flex-start", gap: "9px", padding: "10px 11px",
                                    borderRadius: "9px", textAlign: "left", width: "100%", cursor: "pointer",
                                    border: active ? "1px solid rgba(59,130,246,0.45)" : "1px solid rgba(255,255,255,0.06)",
                                    background: active ? "rgba(59,130,246,0.12)" : "rgba(255,255,255,0.02)",
                                    transition: "all 0.15s",
                                }}
                                    onMouseEnter={e => { if (!active) (e.currentTarget as HTMLElement).style.background = "rgba(255,255,255,0.04)"; }}
                                    onMouseLeave={e => { if (!active) (e.currentTarget as HTMLElement).style.background = "rgba(255,255,255,0.02)"; }}
                                >
                                    <span style={{ fontSize: "16px", lineHeight: 1, flexShrink: 0, marginTop: "1px" }}>{ct.icon}</span>
                                    <div>
                                        <p style={{ fontSize: "12px", fontWeight: 700, color: active ? "#93c5fd" : "#fff", margin: "0 0 2px" }}>{ct.label}</p>
                                        <p style={{ fontSize: "10px", color: "#4B5563", margin: 0, lineHeight: 1.4 }}>{ct.desc}</p>
                                    </div>
                                </button>
                            );
                        })}
                    </div>
                    <p style={{ fontSize: "10px", color: "#374151", margin: "10px 0 0", lineHeight: 1.4 }}>
                        Select a chart type to prefill your prompt.
                    </p>
                </div>
            </div>

            <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        </div>
    );
}
