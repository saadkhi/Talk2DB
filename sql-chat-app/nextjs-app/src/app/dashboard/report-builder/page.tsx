"use client";
import React, { useState } from "react";
import ChartRenderer from "@/components/data/ChartRenderer";
import DataTable from "@/components/data/DataTable";

interface ReportData {
    sql: string;
    columns: string[];
    rows: any[];
    chartConfig: {
        chartType: "bar" | "line" | "pie" | "area" | "scatter";
        xKey: string;
        yKeys: string[];
        title: string;
    };
}

interface Narrative {
    title: string;
    summary: string;
    insights: string[];
    recommendations: string[];
}

export default function ReportBuilderPage() {
    const [prompt, setPrompt] = useState("");
    const [loading, setLoading] = useState(false);
    const [narrativeLoading, setNarrativeLoading] = useState(false);
    const [saving, setSaving] = useState(false);
    const [savedId, setSavedId] = useState<string | null>(null);

    const [reportData, setReportData] = useState<ReportData | null>(null);
    const [narrative, setNarrative] = useState<Narrative | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [saveError, setSaveError] = useState<string | null>(null);

    const handleBuildReport = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!prompt.trim()) return;

        setLoading(true);
        setNarrativeLoading(false);
        setError(null);
        setSaveError(null);
        setReportData(null);
        setNarrative(null);
        setSavedId(null);

        try {
            // Step 1: Fetch primary report data (SQL + chart config)
            const dataRes = await fetch("/api/report", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ prompt }),
            });

            const dataResult = await dataRes.json();
            if (!dataRes.ok) throw new Error(dataResult.error || "Failed to fetch report data");

            setReportData(dataResult);
            setLoading(false);
            setNarrativeLoading(true);

            // Step 2: Generate AI narrative (summary + insights)
            const narrativeRes = await fetch("/api/report/narrative", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    prompt,
                    columns: dataResult.columns,
                    sampleRows: dataResult.rows,
                }),
            });

            const narrativeResult = await narrativeRes.json();
            if (!narrativeRes.ok) throw new Error(narrativeResult.error || "Failed to compile narrative");

            setNarrative(narrativeResult);
        } catch (err: any) {
            console.error(err);
            setError(err.message || "Failed to compile report.");
        } finally {
            setLoading(false);
            setNarrativeLoading(false);
        }
    };

    const handleSaveReport = async () => {
        if (!reportData || !narrative) return;
        setSaving(true);
        setSaveError(null);
        setSavedId(null);

        try {
            const res = await fetch("/api/report/save", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    title: narrative.title || prompt.slice(0, 80),
                    prompt,
                    sql: reportData.sql,
                    chartType: reportData.chartConfig.chartType,
                    summary: narrative.summary,
                    insights: narrative.insights,
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

    return (
        <div style={{ maxWidth: "1100px", margin: "0 auto", display: "flex", flexDirection: "column", gap: "24px" }}>
            {/* Header */}
            <div>
                <h1 style={{ fontSize: "22px", fontWeight: 800, color: "#fff", margin: "0 0 4px", letterSpacing: "-0.03em" }}>
                    Report Builder
                </h1>
                <p style={{ fontSize: "13px", color: "#6B7280", margin: 0 }}>
                    Compile executive analytics: live query datasets, interactive charts, AI-driven summaries and strategic insights.
                </p>
            </div>

            {/* Prompt form */}
            <div style={{ background: "#0d0f1a", border: "1px solid rgba(255,255,255,0.08)", borderRadius: "14px", padding: "22px 24px" }}>
                <form onSubmit={handleBuildReport} style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
                    <label style={{ fontSize: "11px", fontWeight: 700, color: "#6B7280", textTransform: "uppercase", letterSpacing: "0.08em" }}>
                        Report Subject
                    </label>
                    <textarea
                        placeholder="e.g. Show monthly revenue by product category for the last 6 months with trends..."
                        value={prompt}
                        onChange={(e) => setPrompt(e.target.value)}
                        disabled={loading || narrativeLoading}
                        required
                        style={{
                            background: "#080a12", border: "1px solid rgba(255,255,255,0.08)",
                            color: "#fff", padding: "14px 16px", borderRadius: "10px",
                            fontSize: "13px", minHeight: "88px", resize: "vertical",
                            fontFamily: "inherit", lineHeight: 1.6, outline: "none",
                            transition: "border-color 0.15s",
                        }}
                        onFocus={e => (e.currentTarget.style.borderColor = "#6366f1")}
                        onBlur={e => (e.currentTarget.style.borderColor = "rgba(255,255,255,0.08)")}
                    />
                    <div style={{ display: "flex", justifyContent: "flex-end" }}>
                        <button
                            type="submit"
                            disabled={loading || narrativeLoading}
                            style={{
                                padding: "10px 24px", borderRadius: "10px", fontSize: "13px",
                                fontWeight: 700, cursor: loading || narrativeLoading ? "not-allowed" : "pointer",
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

            {/* Error */}
            {error && (
                <div style={{ background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.2)", borderRadius: "10px", padding: "14px 16px" }}>
                    <p style={{ fontSize: "12px", fontWeight: 700, color: "#f87171", margin: "0 0 4px" }}>⚠ Report Error</p>
                    <p style={{ fontSize: "12px", color: "#fca5a5", margin: 0 }}>{error}</p>
                </div>
            )}

            {/* Report output */}
            {reportData && (
                <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>

                    {/* Report header card: title + executive summary + save button */}
                    <div style={{ background: "#0d0f1a", border: "1px solid rgba(255,255,255,0.08)", borderRadius: "14px", padding: "22px 24px" }}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "12px", marginBottom: "16px", paddingBottom: "16px", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
                            <div>
                                <h2 style={{ fontSize: "18px", fontWeight: 800, color: "#fff", margin: "0 0 4px", letterSpacing: "-0.02em" }}>
                                    {narrative?.title || "Generating report…"}
                                </h2>
                                <span style={{ fontSize: "10px", fontWeight: 700, color: "#10b981", background: "rgba(16,185,129,0.1)", border: "1px solid rgba(16,185,129,0.2)", borderRadius: "20px", padding: "2px 10px", letterSpacing: "0.08em" }}>
                                    LIVE POSTGRES
                                </span>
                            </div>

                            {/* Save button — only visible when report + narrative are both ready */}
                            {isComplete && (
                                <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: "6px" }}>
                                    {savedId ? (
                                        <div style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "12px", fontWeight: 600, color: "#10b981" }}>
                                            <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                                            </svg>
                                            Report saved
                                        </div>
                                    ) : (
                                        <button
                                            onClick={handleSaveReport}
                                            disabled={saving}
                                            style={{
                                                display: "flex", alignItems: "center", gap: "7px",
                                                padding: "8px 18px", borderRadius: "9px",
                                                background: saving ? "rgba(99,102,241,0.3)" : "rgba(99,102,241,0.12)",
                                                border: "1px solid rgba(99,102,241,0.3)",
                                                color: "#818cf8", fontSize: "12px", fontWeight: 700,
                                                cursor: saving ? "not-allowed" : "pointer",
                                                transition: "all 0.15s",
                                            }}
                                            onMouseEnter={e => { if (!saving) { (e.currentTarget as HTMLElement).style.background = "rgba(99,102,241,0.2)"; (e.currentTarget as HTMLElement).style.color = "#a5b4fc"; } }}
                                            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = "rgba(99,102,241,0.12)"; (e.currentTarget as HTMLElement).style.color = "#818cf8"; }}
                                        >
                                            {saving ? (
                                                <>
                                                    <div style={{ width: "12px", height: "12px", border: "2px solid rgba(129,140,248,0.3)", borderTop: "2px solid #818cf8", borderRadius: "50%", animation: "spin 0.7s linear infinite" }} />
                                                    Saving…
                                                </>
                                            ) : (
                                                <>
                                                    <svg width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" d="M17.593 3.322c1.1.128 1.907 1.077 1.907 2.185V21L12 17.25 4.5 21V5.507c0-1.108.806-2.057 1.907-2.185a48.507 48.507 0 0111.186 0z" />
                                                    </svg>
                                                    Save Report
                                                </>
                                            )}
                                        </button>
                                    )}
                                    {saveError && (
                                        <p style={{ fontSize: "11px", color: "#f87171", margin: 0 }}>{saveError}</p>
                                    )}
                                </div>
                            )}
                        </div>

                        {/* Executive summary */}
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

                    {/* Chart + Insights/Recommendations */}
                    <div style={{ display: "grid", gridTemplateColumns: "1fr minmax(220px, 300px)", gap: "20px" }}>
                        {/* Chart */}
                        <div style={{ background: "#0d0f1a", border: "1px solid rgba(255,255,255,0.08)", borderRadius: "14px", padding: "20px 22px" }}>
                            <ChartRenderer
                                chartType={reportData.chartConfig.chartType}
                                data={reportData.rows}
                                xKey={reportData.chartConfig.xKey}
                                yKeys={reportData.chartConfig.yKeys}
                                title={reportData.chartConfig.title}
                            />
                        </div>

                        {/* Insights + Recommendations */}
                        <div style={{ background: "#0d0f1a", border: "1px solid rgba(255,255,255,0.08)", borderRadius: "14px", padding: "20px 22px", display: "flex", flexDirection: "column", gap: "20px" }}>
                            <div>
                                <p style={{ fontSize: "10px", fontWeight: 700, color: "#6B7280", textTransform: "uppercase", letterSpacing: "0.1em", margin: "0 0 10px", paddingBottom: "8px", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>AI Insights</p>
                                {narrativeLoading ? (
                                    <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                                        {[80, 90, 70].map((w, i) => (
                                            <div key={i} style={{ height: "10px", borderRadius: "5px", background: "rgba(255,255,255,0.05)", width: `${w}%` }} />
                                        ))}
                                    </div>
                                ) : narrative && (
                                    <ul style={{ margin: 0, paddingLeft: "16px", display: "flex", flexDirection: "column", gap: "8px" }}>
                                        {narrative.insights.map((ins, i) => (
                                            <li key={i} style={{ fontSize: "12px", color: "#9CA3AF", lineHeight: 1.55 }}>{ins}</li>
                                        ))}
                                    </ul>
                                )}
                            </div>
                            <div>
                                <p style={{ fontSize: "10px", fontWeight: 700, color: "#6B7280", textTransform: "uppercase", letterSpacing: "0.1em", margin: "0 0 10px", paddingBottom: "8px", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>Recommendations</p>
                                {narrativeLoading ? (
                                    <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                                        {[75, 85].map((w, i) => (
                                            <div key={i} style={{ height: "10px", borderRadius: "5px", background: "rgba(255,255,255,0.05)", width: `${w}%` }} />
                                        ))}
                                    </div>
                                ) : narrative && (
                                    <ul style={{ margin: 0, paddingLeft: "16px", display: "flex", flexDirection: "column", gap: "8px" }}>
                                        {narrative.recommendations.map((rec, i) => (
                                            <li key={i} style={{ fontSize: "12px", color: "#10b981", lineHeight: 1.55 }}>{rec}</li>
                                        ))}
                                    </ul>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* SQL details */}
                    <details style={{ background: "#080a12", border: "1px solid rgba(255,255,255,0.07)", borderRadius: "12px", padding: "14px 18px", cursor: "pointer" }}>
                        <summary style={{ fontSize: "11px", fontWeight: 700, color: "#6B7280", textTransform: "uppercase", letterSpacing: "0.08em", outline: "none", userSelect: "none", display: "flex", justifyContent: "space-between" }}>
                            <span>Generated SQL</span>
                            <span style={{ color: "#6366f1" }}>▼</span>
                        </summary>
                        <pre style={{ margin: "12px 0 0", padding: "14px", background: "#030408", borderRadius: "8px", border: "1px solid rgba(255,255,255,0.06)", fontSize: "11px", fontFamily: "monospace", color: "#818cf8", overflowX: "auto", whiteSpace: "pre-wrap", lineHeight: 1.7 }}>
                            {reportData.sql}
                        </pre>
                    </details>

                    {/* Data table */}
                    <div style={{ background: "#0d0f1a", border: "1px solid rgba(255,255,255,0.08)", borderRadius: "14px", padding: "20px 22px" }}>
                        <p style={{ fontSize: "11px", fontWeight: 700, color: "#6B7280", textTransform: "uppercase", letterSpacing: "0.08em", margin: "0 0 14px", paddingBottom: "10px", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
                            Data Table — {reportData.rows.length} records
                        </p>
                        <DataTable columns={reportData.columns} rows={reportData.rows} pageSize={10} />
                    </div>
                </div>
            )}

            <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        </div>
    );
}
