"use client";
import React, { useState, useEffect } from "react";
import ChartRenderer from "@/components/data/ChartRenderer";
import DataTable from "@/components/data/DataTable";
import GuestBanner from "@/components/guest/GuestBanner";
import { usePageState } from "@/context/PageStateContext";
import { useGuestGuard } from "@/lib/useGuestGuard";

interface SchemaCol   { name: string; type: string; isPrimary: boolean; }
interface SchemaTable { name: string; rowCount: number; columns: SchemaCol[]; }

const card = { background: "#0d0f1a", border: "1px solid rgba(255,255,255,0.08)", borderRadius: "14px" } as const;
const lbl  = { fontSize: "10px", fontWeight: 700, color: "#6B7280", textTransform: "uppercase" as const, letterSpacing: "0.08em" };
const spin = `@keyframes spin { to { transform: rotate(360deg); } }`;

export default function ReportBuilderPage() {
    const { reportBuilder: s, setReportBuilder: set } = usePageState();
    const { prompt, reportData, narrative, savedId, error } = s;
    const setPrompt     = (v: string)            => set({ prompt: v });
    const setReportData = (v: typeof reportData) => set({ reportData: v });
    const setNarrative  = (v: typeof narrative)  => set({ narrative: v });
    const setSavedId    = (v: string | null)      => set({ savedId: v });
    const setError      = (v: string | null)      => set({ error: v });

    const [loading, setLoading]                   = useState(false);
    const [narrativeLoading, setNarrativeLoading] = useState(false);
    const [saving, setSaving]                     = useState(false);
    const [saveError, setSaveError]               = useState<string | null>(null);
    const { isGuest, sessionReady, guardedSubmit } = useGuestGuard("report");

    // schema sidebar
    const [schemaTables, setSchemaTables]         = useState<SchemaTable[]>([]);
    const [activeTable, setActiveTable]           = useState<SchemaTable | null>(null);

    useEffect(() => {
        if (!sessionReady) return;
        const endpoint = isGuest ? "/api/guest/schema" : "/api/schema";
        fetch(endpoint).then(r => r.json()).then(d => {
            if (d.tables?.length) {
                setSchemaTables(d.tables);
                setActiveTable(d.tables[0]);
            }
        }).catch(() => {});
    }, [sessionReady, isGuest]);

    /* ── handlers ── */
    const handleBuildReport = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!prompt.trim()) return;
        await guardedSubmit(async () => {
            setLoading(true); setNarrativeLoading(false); setError(null);
            setSaveError(null); setReportData(null); setNarrative(null); setSavedId(null);
            try {
                const dataRes = await fetch("/api/report", {
                    method: "POST", headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ prompt }),
                });
                const dataResult = await dataRes.json();
                if (!dataRes.ok) throw new Error(dataResult.error || "Failed to fetch report data");
                setReportData(dataResult);
                setLoading(false);
                setNarrativeLoading(true);
                const narrativeRes = await fetch("/api/report/narrative", {
                    method: "POST", headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ prompt, columns: dataResult.columns, sampleRows: dataResult.rows }),
                });
                const narrativeResult = await narrativeRes.json();
                if (!narrativeRes.ok) throw new Error(narrativeResult.error || "Failed to compile narrative");
                setNarrative(narrativeResult);
            } catch (err: any) {
                setError(err.message || "Failed to compile report.");
            } finally {
                setLoading(false); setNarrativeLoading(false);
            }
        });
    };

    const handleSaveReport = async () => {
        if (!reportData || !narrative) return;
        setSaving(true); setSaveError(null); setSavedId(null);
        try {
            const res = await fetch("/api/report/save", {
                method: "POST", headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    title: narrative.title || prompt.slice(0, 80),
                    prompt, sql: reportData.sql,
                    chartType: reportData.chartConfig.chartType,
                    summary: narrative.summary, insights: narrative.insights,
                }),
            });
            const result = await res.json();
            if (!res.ok) throw new Error(result.error || "Save failed");
            setSavedId(result.id);
        } catch (err: any) {
            setSaveError(err.message || "Failed to save report.");
        } finally {
            setSaving(false);
        }
    };

    const isComplete = !!reportData && !!narrative && !narrativeLoading;

    /* ── render ── */
    return (
        <div style={{ maxWidth: "1300px", margin: "0 auto", display: "flex", flexDirection: "column", gap: "20px" }}>

            {/* Header */}
            <GuestBanner tool="report" />
            <div>
                <h1 style={{ fontSize: "22px", fontWeight: 800, color: "#fff", margin: "0 0 4px", letterSpacing: "-0.03em" }}>Report Builder</h1>
                <p style={{ fontSize: "13px", color: "#6B7280", margin: 0 }}>
                    Compile executive analytics: live query datasets, interactive charts, AI-driven summaries and strategic insights.
                </p>
            </div>

            {/* ── 2-col grid: schema panel | main content ── */}
            <div style={{ display: "grid", gridTemplateColumns: "220px 1fr", gap: "16px", alignItems: "start" }}>

                {/* ── LEFT: schema panel ── */}
                <div style={{ ...card, padding: "14px", display: "flex", flexDirection: "column", gap: "10px", position: "sticky", top: "72px", maxHeight: "calc(100vh - 140px)", overflow: "hidden" }}>
                    <p style={{ ...lbl, margin: 0, paddingBottom: "8px", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
                        Tables {schemaTables.length > 0 && `(${schemaTables.length})`}
                    </p>

                    {/* table list */}
                    <div style={{ display: "flex", flexDirection: "column", gap: "2px", overflowY: "auto", maxHeight: "160px" }}>
                        {schemaTables.length === 0 && <p style={{ fontSize: "11px", color: "#374151", margin: 0 }}>No database connected</p>}
                        {schemaTables.map(t => {
                            const active = activeTable?.name === t.name;
                            return (
                                <button key={t.name} onClick={() => setActiveTable(t)} style={{
                                    display: "flex", alignItems: "center", gap: "6px", padding: "7px 9px",
                                    borderRadius: "7px", border: active ? "1px solid rgba(99,102,241,0.4)" : "1px solid transparent",
                                    background: active ? "rgba(99,102,241,0.12)" : "transparent",
                                    cursor: "pointer", textAlign: "left", width: "100%", transition: "background 0.12s",
                                }}
                                    onMouseEnter={e => { if (!active) (e.currentTarget as HTMLElement).style.background = "rgba(255,255,255,0.04)"; }}
                                    onMouseLeave={e => { if (!active) (e.currentTarget as HTMLElement).style.background = "transparent"; }}
                                >
                                    <svg width="10" height="10" fill="none" stroke={active ? "#818cf8" : "#4B5563"} strokeWidth="2" viewBox="0 0 24 24" style={{ flexShrink: 0 }}>
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M20.25 6.375c0 2.278-3.694 4.125-8.25 4.125S3.75 8.653 3.75 6.375m16.5 0c0-2.278-3.694-4.125-8.25-4.125S3.75 4.097 3.75 6.375m16.5 0v11.25c0 2.278-3.694 4.125-8.25 4.125s-8.25-1.847-8.25-4.125V6.375m16.5 2.625c0 2.278-3.694 4.125-8.25 4.125s-8.25-1.847-8.25-4.125" />
                                    </svg>
                                    <span style={{ fontSize: "12px", fontFamily: "monospace", fontWeight: active ? 700 : 400, color: active ? "#a5b4fc" : "#9CA3AF", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", flex: 1 }}>{t.name}</span>
                                    <span style={{ fontSize: "9px", color: "#374151", flexShrink: 0 }}>{t.rowCount.toLocaleString()}</span>
                                </button>
                            );
                        })}
                    </div>

                    {/* columns of selected table */}
                    {activeTable && activeTable.columns.length > 0 && (
                        <div style={{ borderTop: "1px solid rgba(255,255,255,0.06)", paddingTop: "10px", display: "flex", flexDirection: "column", gap: "6px" }}>
                            <p style={{ fontSize: "9px", fontWeight: 700, color: "#6B7280", textTransform: "uppercase", letterSpacing: "0.08em", margin: 0 }}>
                                {activeTable.name} · {activeTable.columns.length} cols
                            </p>
                            <div style={{ display: "flex", flexDirection: "column", gap: "1px", overflowY: "auto" }}>
                                {activeTable.columns.map(col => (
                                    <div key={col.name}
                                        onClick={() => setPrompt(prompt ? `${prompt} ${col.name}` : col.name)}
                                        title={`Click to add "${col.name}" to prompt`}
                                        style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "4px 6px", borderRadius: "5px", gap: "6px", cursor: "pointer", transition: "background 0.1s" }}
                                        onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = "rgba(255,255,255,0.04)"}
                                        onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = "transparent"}
                                    >
                                        <div style={{ display: "flex", alignItems: "center", gap: "4px", minWidth: 0 }}>
                                            {col.isPrimary && <span style={{ fontSize: "9px", flexShrink: 0 }}>🔑</span>}
                                            <span style={{ fontSize: "11px", fontFamily: "monospace", color: col.isPrimary ? "#fbbf24" : "#D1D5DB", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{col.name}</span>
                                        </div>
                                        <span style={{ fontSize: "9px", color: "#4B5563", flexShrink: 0, fontFamily: "monospace" }}>
                                            {col.type.replace("character varying", "varchar").replace("timestamp without time zone", "ts")}
                                        </span>
                                    </div>
                                ))}
                            </div>
                            <p style={{ fontSize: "10px", color: "#374151", margin: 0, lineHeight: 1.4 }}>
                                Click a column to add it to your prompt.
                            </p>
                        </div>
                    )}
                </div>

                {/* ── RIGHT: report content ── */}
                <div style={{ display: "flex", flexDirection: "column", gap: "20px", minWidth: 0 }}>

                    {/* prompt form */}
                    <div style={{ ...card, padding: "22px 24px" }}>
                        <form onSubmit={handleBuildReport} style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
                            <label style={lbl}>Report Subject</label>
                            <textarea
                                placeholder="e.g. Show monthly revenue by product category for the last 6 months with trends…"
                                value={prompt}
                                onChange={e => setPrompt(e.target.value)}
                                disabled={loading || narrativeLoading}
                                required
                                style={{
                                    background: "#080a12", border: "1px solid rgba(255,255,255,0.08)",
                                    color: "#fff", padding: "14px 16px", borderRadius: "10px",
                                    fontSize: "13px", minHeight: "88px", resize: "vertical",
                                    fontFamily: "inherit", lineHeight: 1.6, outline: "none", transition: "border-color 0.15s",
                                    width: "100%", boxSizing: "border-box",
                                }}
                                onFocus={e => (e.currentTarget.style.borderColor = "#6366f1")}
                                onBlur={e => (e.currentTarget.style.borderColor = "rgba(255,255,255,0.08)")}
                            />
                            <div style={{ display: "flex", justifyContent: "flex-end" }}>
                                <button type="submit" disabled={loading || narrativeLoading} style={{
                                    padding: "10px 24px", borderRadius: "10px", fontSize: "13px", fontWeight: 700,
                                    cursor: loading || narrativeLoading ? "not-allowed" : "pointer",
                                    background: loading || narrativeLoading ? "rgba(99,102,241,0.4)" : "linear-gradient(135deg,#6366f1,#8b5cf6)",
                                    color: "#fff", border: "none",
                                    boxShadow: loading || narrativeLoading ? "none" : "0 4px 14px rgba(99,102,241,0.3)",
                                    transition: "filter 0.15s",
                                }}
                                    onMouseEnter={e => { if (!loading && !narrativeLoading) (e.currentTarget as HTMLElement).style.filter = "brightness(1.1)"; }}
                                    onMouseLeave={e => (e.currentTarget as HTMLElement).style.filter = "none"}
                                >
                                    {loading ? "Compiling Dataset…" : narrativeLoading ? "Generating AI Narrative…" : "Compile Report"}
                                </button>
                            </div>
                        </form>
                    </div>

                    {/* error */}
                    {error && (
                        <div style={{ background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.2)", borderRadius: "10px", padding: "14px 16px" }}>
                            <p style={{ fontSize: "12px", fontWeight: 700, color: "#f87171", margin: "0 0 4px" }}>⚠ Report Error</p>
                            <p style={{ fontSize: "12px", color: "#fca5a5", margin: 0 }}>{error}</p>
                        </div>
                    )}

                    {/* report output */}
                    {reportData && (
                        <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>

                            {/* title + summary + save */}
                            <div style={{ ...card, padding: "22px 24px" }}>
                                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "12px", marginBottom: "16px", paddingBottom: "16px", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
                                    <div>
                                        <h2 style={{ fontSize: "18px", fontWeight: 800, color: "#fff", margin: "0 0 4px", letterSpacing: "-0.02em" }}>
                                            {narrative?.title || "Generating report…"}
                                        </h2>
                                        <span style={{ fontSize: "10px", fontWeight: 700, color: "#10b981", background: "rgba(16,185,129,0.1)", border: "1px solid rgba(16,185,129,0.2)", borderRadius: "20px", padding: "2px 10px", letterSpacing: "0.08em" }}>
                                            LIVE POSTGRES
                                        </span>
                                    </div>
                                    {isComplete && (
                                        <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: "6px" }}>
                                            {savedId ? (
                                                <div style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "12px", fontWeight: 600, color: "#10b981" }}>
                                                    <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" /></svg>
                                                    Report saved
                                                </div>
                                            ) : (
                                                <button onClick={handleSaveReport} disabled={saving} style={{
                                                    display: "flex", alignItems: "center", gap: "7px", padding: "8px 18px", borderRadius: "9px",
                                                    background: saving ? "rgba(99,102,241,0.3)" : "rgba(99,102,241,0.12)",
                                                    border: "1px solid rgba(99,102,241,0.3)", color: "#818cf8",
                                                    fontSize: "12px", fontWeight: 700, cursor: saving ? "not-allowed" : "pointer", transition: "all 0.15s",
                                                }}
                                                    onMouseEnter={e => { if (!saving) { (e.currentTarget as HTMLElement).style.background = "rgba(99,102,241,0.2)"; (e.currentTarget as HTMLElement).style.color = "#a5b4fc"; } }}
                                                    onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = "rgba(99,102,241,0.12)"; (e.currentTarget as HTMLElement).style.color = "#818cf8"; }}
                                                >
                                                    {saving ? <><div style={{ width: "12px", height: "12px", border: "2px solid rgba(129,140,248,0.3)", borderTop: "2px solid #818cf8", borderRadius: "50%", animation: "spin 0.7s linear infinite" }} />Saving…</> : <><svg width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M17.593 3.322c1.1.128 1.907 1.077 1.907 2.185V21L12 17.25 4.5 21V5.507c0-1.108.806-2.057 1.907-2.185a48.507 48.507 0 0111.186 0z" /></svg>Save Report</>}
                                                </button>
                                            )}
                                            {saveError && <p style={{ fontSize: "11px", color: "#f87171", margin: 0 }}>{saveError}</p>}
                                        </div>
                                    )}
                                </div>
                                {narrativeLoading && (
                                    <div style={{ display: "flex", alignItems: "center", gap: "10px", padding: "16px 0", color: "#6B7280", fontSize: "13px" }}>
                                        <div style={{ width: "16px", height: "16px", border: "2px solid rgba(99,102,241,0.2)", borderTop: "2px solid #6366f1", borderRadius: "50%", animation: "spin 0.7s linear infinite", flexShrink: 0 }} />
                                        Compiling AI analysis…
                                    </div>
                                )}
                                {narrative && (
                                    <div style={{ background: "rgba(99,102,241,0.06)", border: "1px solid rgba(99,102,241,0.15)", borderRadius: "10px", padding: "14px 16px" }}>
                                        <p style={{ fontSize: "10px", fontWeight: 700, color: "#818cf8", textTransform: "uppercase", letterSpacing: "0.1em", margin: "0 0 6px" }}>Executive Summary</p>
                                        <p style={{ fontSize: "13px", color: "#D1D5DB", lineHeight: 1.65, margin: 0 }}>{narrative.summary}</p>
                                    </div>
                                )}
                            </div>

                            {/* chart + insights */}
                            <div style={{ display: "grid", gridTemplateColumns: "1fr minmax(220px, 300px)", gap: "20px" }}>
                                <div style={{ ...card, padding: "20px 22px" }}>
                                    <ChartRenderer
                                        chartType={reportData.chartConfig.chartType}
                                        data={reportData.rows}
                                        xKey={reportData.chartConfig.xKey}
                                        yKeys={reportData.chartConfig.yKeys}
                                        title={reportData.chartConfig.title}
                                    />
                                </div>
                                <div style={{ ...card, padding: "20px 22px", display: "flex", flexDirection: "column", gap: "20px" }}>
                                    <div>
                                        <p style={{ ...lbl, margin: "0 0 10px", paddingBottom: "8px", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>AI Insights</p>
                                        {narrativeLoading ? <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>{[80,90,70].map((w,i)=><div key={i} style={{ height: "10px", borderRadius: "5px", background: "rgba(255,255,255,0.05)", width: `${w}%` }}/>)}</div>
                                        : narrative && <ul style={{ margin: 0, paddingLeft: "16px", display: "flex", flexDirection: "column", gap: "8px" }}>{narrative.insights.map((ins,i)=><li key={i} style={{ fontSize: "12px", color: "#9CA3AF", lineHeight: 1.55 }}>{ins}</li>)}</ul>}
                                    </div>
                                    <div>
                                        <p style={{ ...lbl, margin: "0 0 10px", paddingBottom: "8px", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>Recommendations</p>
                                        {narrativeLoading ? <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>{[75,85].map((w,i)=><div key={i} style={{ height: "10px", borderRadius: "5px", background: "rgba(255,255,255,0.05)", width: `${w}%` }}/>)}</div>
                                        : narrative && <ul style={{ margin: 0, paddingLeft: "16px", display: "flex", flexDirection: "column", gap: "8px" }}>{narrative.recommendations.map((rec,i)=><li key={i} style={{ fontSize: "12px", color: "#10b981", lineHeight: 1.55 }}>{rec}</li>)}</ul>}
                                    </div>
                                </div>
                            </div>

                            {/* SQL */}
                            <details style={{ background: "#080a12", border: "1px solid rgba(255,255,255,0.07)", borderRadius: "12px", padding: "14px 18px", cursor: "pointer" }}>
                                <summary style={{ ...lbl, outline: "none", userSelect: "none", display: "flex", justifyContent: "space-between", cursor: "pointer" }}>
                                    <span>Generated SQL</span><span style={{ color: "#6366f1" }}>▼</span>
                                </summary>
                                <pre style={{ margin: "12px 0 0", padding: "14px", background: "#030408", borderRadius: "8px", border: "1px solid rgba(255,255,255,0.06)", fontSize: "11px", fontFamily: "monospace", color: "#818cf8", overflowX: "auto", whiteSpace: "pre-wrap", lineHeight: 1.7 }}>
                                    {reportData.sql}
                                </pre>
                            </details>

                            {/* data table */}
                            <div style={{ ...card, padding: "20px 22px" }}>
                                <p style={{ ...lbl, margin: "0 0 14px", paddingBottom: "10px", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
                                    Data Table — {reportData.rows.length} records
                                </p>
                                <DataTable columns={reportData.columns} rows={reportData.rows} pageSize={10} />
                            </div>
                        </div>
                    )}
                </div>{/* end right column */}
            </div>{/* end grid */}

            <style>{spin}</style>
        </div>
    );
}
