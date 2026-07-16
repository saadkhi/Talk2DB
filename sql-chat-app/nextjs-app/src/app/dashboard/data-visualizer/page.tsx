"use client";
import React, { useState } from "react";
import ChartRenderer from "@/components/data/ChartRenderer";
import DataTable from "@/components/data/DataTable";

const EXAMPLES = [
    "Compare conversations per user as a bar chart",
    "Show daily message volume over the last week",
    "Pie chart of database dialect distribution",
];

const card = { background: "#0d0f1a", border: "1px solid rgba(255,255,255,0.08)", borderRadius: "14px" };
const label = { fontSize: "11px", fontWeight: 700, color: "#6B7280", textTransform: "uppercase" as const, letterSpacing: "0.08em" };

export default function DataVisualizerPage() {
    const [prompt, setPrompt] = useState("");
    const [loading, setLoading] = useState(false);
    const [result, setResult] = useState<{
        chartType: "bar" | "line" | "pie" | "area";
        xKey: string; yKeys: string[]; title: string;
        sql: string; columns: string[]; data: any[];
    } | null>(null);
    const [error, setError] = useState<string | null>(null);

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
        <div style={{ display: "flex", flexDirection: "column", gap: "24px", maxWidth: "1100px", margin: "0 auto", width: "100%" }}>
            {/* Header */}
            <div>
                <h1 style={{ fontSize: "22px", fontWeight: 800, color: "#fff", margin: "0 0 4px", letterSpacing: "-0.03em" }}>Data Visualizer</h1>
                <p style={{ fontSize: "13px", color: "#6B7280", margin: 0 }}>Describe the chart you want — Talk2DB generates the SQL, fetches the data, and renders it.</p>
            </div>

            {/* Input card */}
            <div style={{ ...card, padding: "22px 24px" }}>
                <form onSubmit={e => { e.preventDefault(); run(prompt); }} style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
                    <label style={label}>Visualization Request</label>
                    <textarea
                        value={prompt} onChange={e => setPrompt(e.target.value)}
                        placeholder="e.g. Bar chart showing the number of conversations per user..."
                        disabled={loading} required rows={3}
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
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "10px" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
                            <span style={{ fontSize: "11px", color: "#4B5563", fontWeight: 600 }}>Try:</span>
                            {EXAMPLES.map(ex => (
                                <button key={ex} type="button" disabled={loading}
                                    onClick={() => { setPrompt(ex); run(ex); }}
                                    style={{
                                        fontSize: "11px", padding: "5px 12px", borderRadius: "20px",
                                        background: "rgba(59,130,246,0.08)", border: "1px solid rgba(59,130,246,0.2)",
                                        color: "#93c5fd", cursor: "pointer", transition: "all 0.15s", whiteSpace: "nowrap",
                                    }}
                                    onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = "rgba(59,130,246,0.15)"}
                                    onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = "rgba(59,130,246,0.08)"}
                                >{ex}</button>
                            ))}
                        </div>
                        <button type="submit" disabled={loading} style={{
                            padding: "10px 28px", borderRadius: "10px", fontSize: "13px", fontWeight: 700,
                            background: loading ? "rgba(59,130,246,0.4)" : "linear-gradient(135deg,#3b82f6,#6366f1)",
                            color: "#fff", border: "none", cursor: loading ? "not-allowed" : "pointer",
                            boxShadow: loading ? "none" : "0 4px 14px rgba(59,130,246,0.3)", transition: "filter 0.15s",
                            display: "flex", alignItems: "center", gap: "8px",
                        }}
                            onMouseEnter={e => { if (!loading) (e.currentTarget as HTMLElement).style.filter = "brightness(1.1)"; }}
                            onMouseLeave={e => (e.currentTarget as HTMLElement).style.filter = "none"}
                        >
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
                    {/* Chart */}
                    <div style={{ ...card, padding: "24px" }}>
                        <ChartRenderer
                            chartType={result.chartType} data={result.data}
                            xKey={result.xKey} yKeys={result.yKeys} title={result.title}
                        />
                    </div>

                    {/* SQL toggle */}
                    <details style={{ ...card, padding: "14px 20px", cursor: "pointer" }}>
                        <summary style={{ fontSize: "11px", fontWeight: 700, color: "#6B7280", textTransform: "uppercase", letterSpacing: "0.08em", outline: "none", userSelect: "none", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                            <span>Generated SQL</span>
                            <svg width="12" height="12" fill="none" stroke="#6366f1" strokeWidth="2.5" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" /></svg>
                        </summary>
                        <pre style={{ margin: "12px 0 0", padding: "14px", background: "#080a12", borderRadius: "8px", border: "1px solid rgba(255,255,255,0.06)", fontSize: "11px", fontFamily: "monospace", color: "#818cf8", overflowX: "auto", whiteSpace: "pre-wrap", lineHeight: 1.7 }}>{result.sql}</pre>
                    </details>

                    {/* Data table */}
                    {result.data.length > 0 && (
                        <div style={{ ...card, padding: "20px 22px" }}>
                            <p style={{ ...label, margin: "0 0 14px", paddingBottom: "10px", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
                                Underlying Data — {result.data.length} records
                            </p>
                            <DataTable columns={result.columns} rows={result.data} pageSize={10} />
                        </div>
                    )}
                </>
            )}

            <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        </div>
    );
}
