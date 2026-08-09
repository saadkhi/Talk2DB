"use client";
import React, { useState, useRef, useCallback, useEffect } from "react";
import Link from "next/link";
import { useDatabase } from "@/context/DatabaseContext";

// ── Types ─────────────────────────────────────────────────────────────────────
interface ColumnStat {
    name: string;
    type: "string" | "number" | "date" | "boolean" | "mixed";
    nullCount: number;
    nullPct: number;
    distinctCount: number;
    sampleValues: string[];
    min?: number; max?: number; avg?: number;
    minDate?: string; maxDate?: string;
}

interface ParsedDataset {
    fileName: string;
    format: "csv" | "excel" | "pdf";
    columns: string[];
    rows: Record<string, any>[];
    totalRows: number;
    stats: ColumnStat[];
    sheets?: string[];
    text?: string;
}

interface CompareResult {
    summary: {
        totalA: number; totalB: number; exactMatches: number; fuzzyMatches: number;
        totalMatches: number; onlyInA: number; onlyInB: number; conflicts: number; matchRate: number;
    };
    matches: any[]; onlyInA: any[]; onlyInB: any[]; conflicts: any[];
    meta: { fileNameA: string; fileNameB: string; matchColumn: string; sharedCols: string[]; fuzzyThreshold: number };
}

// ── Shared style constants ────────────────────────────────────────────────────
const card: React.CSSProperties = {
    background: "#0d0f1a", border: "1px solid rgba(255,255,255,0.07)", borderRadius: "14px",
};
const label: React.CSSProperties = {
    fontSize: "10px", fontWeight: 700, color: "#6B7280",
    textTransform: "uppercase", letterSpacing: "0.08em",
};
const ACCENT = "#06b6d4"; // cyan — distinctive from other tools
const ACCENT2 = "#0ea5e9";

function Spinner({ size = 16, color = ACCENT }: { size?: number; color?: string }) {
    return (
        <div style={{
            width: size, height: size, flexShrink: 0,
            border: `2px solid rgba(6,182,212,0.15)`, borderTop: `2px solid ${color}`,
            borderRadius: "50%", animation: "spin 0.7s linear infinite",
        }} />
    );
}

// ── Tab bar ───────────────────────────────────────────────────────────────────
type Tab = "extract" | "profile" | "compare" | "insights";
const TABS: { id: Tab; label: string; desc: string }[] = [
    { id: "extract",  label: "Extract",   desc: "Upload & parse files" },
    { id: "profile",  label: "Profile",   desc: "Column quality analysis" },
    { id: "compare",  label: "Compare",   desc: "Fuzzy match datasets" },
    { id: "insights", label: "AI Insights", desc: "LLM-powered analysis" },
];

// ── Upload dropzone ───────────────────────────────────────────────────────────
function DropZone({ onFile, loading, label: lbl, slot }: {
    onFile: (f: File) => void; loading: boolean; label: string; slot: "A" | "B";
}) {
    const ref = useRef<HTMLInputElement>(null);
    const [dragging, setDragging] = useState(false);

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault(); setDragging(false);
        const f = e.dataTransfer.files[0];
        if (f) onFile(f);
    };

    const color = slot === "A" ? ACCENT : "#a78bfa";

    return (
        <div
            onClick={() => ref.current?.click()}
            onDragOver={e => { e.preventDefault(); setDragging(true); }}
            onDragLeave={() => setDragging(false)}
            onDrop={handleDrop}
            style={{
                border: `2px dashed ${dragging ? color : "rgba(255,255,255,0.12)"}`,
                borderRadius: "12px", padding: "32px 20px", textAlign: "center",
                cursor: loading ? "not-allowed" : "pointer", transition: "all 0.2s",
                background: dragging ? `${color}0a` : "rgba(255,255,255,0.02)",
            }}
        >
            <input ref={ref} type="file" accept=".csv,.tsv,.xlsx,.xls,.pdf"
                style={{ display: "none" }} onChange={e => { const f = e.target.files?.[0]; if (f) onFile(f); }} />
            {loading
                ? <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "10px", color: "#6B7280", fontSize: "13px" }}>
                    <Spinner color={color} /> Parsing file…
                  </div>
                : <>
                    <div style={{ width: "40px", height: "40px", borderRadius: "12px", background: `${color}18`, display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 12px" }}>
                        <svg width="20" height="20" fill="none" stroke={color} strokeWidth="2" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
                        </svg>
                    </div>
                    <p style={{ fontSize: "13px", fontWeight: 700, color: "var(--text-primary)", margin: "0 0 4px" }}>{lbl}</p>
                    <p style={{ fontSize: "11px", color: "#6B7280", margin: 0 }}>CSV, Excel (.xlsx/.xls) or PDF — drag & drop or click</p>
                  </>
            }
        </div>
    );
}

// ── DataPreview table ─────────────────────────────────────────────────────────
function DataPreview({ dataset, accent = ACCENT }: { dataset: ParsedDataset; accent?: string }) {
    const [page, setPage] = useState(0);
    const PAGE = 20;
    const totalPages = Math.ceil(dataset.rows.length / PAGE);
    const visibleRows = dataset.rows.slice(page * PAGE, (page + 1) * PAGE);
    const visibleCols = dataset.columns.slice(0, 10);

    return (
        <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "8px" }}>
                <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
                    <span style={{ fontSize: "12px", color: "#6B7280" }}>
                        <strong style={{ color: "var(--text-primary)" }}>{dataset.totalRows.toLocaleString()}</strong> rows ·
                        <strong style={{ color: "var(--text-primary)" }}> {dataset.columns.length}</strong> columns ·
                        <span style={{ color: accent, fontWeight: 700 }}> {dataset.format.toUpperCase()}</span>
                    </span>
                </div>
                {dataset.columns.length > 10 && (
                    <span style={{ fontSize: "10px", color: "#4B5563" }}>Showing 10 of {dataset.columns.length} columns</span>
                )}
            </div>
            <div style={{ overflowX: "auto", borderRadius: "10px", border: "1px solid rgba(255,255,255,0.07)" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "11px" }}>
                    <thead>
                        <tr style={{ background: "rgba(255,255,255,0.03)" }}>
                            <th style={{ padding: "8px 12px", textAlign: "left", color: "#374151", fontWeight: 700, fontSize: "10px", whiteSpace: "nowrap" }}>#</th>
                            {visibleCols.map(col => (
                                <th key={col} style={{ padding: "8px 12px", textAlign: "left", color: accent, fontWeight: 700, fontSize: "10px", whiteSpace: "nowrap", maxWidth: "160px", overflow: "hidden", textOverflow: "ellipsis" }}>{col}</th>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        {visibleRows.map((row, i) => (
                            <tr key={i} style={{ borderTop: "1px solid rgba(255,255,255,0.04)" }}
                                onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = "rgba(255,255,255,0.02)"}
                                onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = "transparent"}
                            >
                                <td style={{ padding: "7px 12px", color: "#374151", fontFamily: "monospace" }}>{page * PAGE + i + 1}</td>
                                {visibleCols.map(col => (
                                    <td key={col} style={{ padding: "7px 12px", color: "#D1D5DB", maxWidth: "200px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                                        {String(row[col] ?? "").slice(0, 80) || <span style={{ color: "#374151" }}>—</span>}
                                    </td>
                                ))}
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
            {totalPages > 1 && (
                <div style={{ display: "flex", alignItems: "center", gap: "8px", justifyContent: "center" }}>
                    <button onClick={() => setPage(p => Math.max(0, p - 1))} disabled={page === 0}
                        style={{ padding: "4px 12px", borderRadius: "6px", fontSize: "11px", background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.1)", color: "#9CA3AF", cursor: page === 0 ? "not-allowed" : "pointer" }}>←</button>
                    <span style={{ fontSize: "11px", color: "#6B7280" }}>Page {page + 1} / {totalPages}</span>
                    <button onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))} disabled={page >= totalPages - 1}
                        style={{ padding: "4px 12px", borderRadius: "6px", fontSize: "11px", background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.1)", color: "#9CA3AF", cursor: page >= totalPages - 1 ? "not-allowed" : "pointer" }}>→</button>
                </div>
            )}
        </div>
    );
}

// ── Profile tab content ───────────────────────────────────────────────────────
function ProfileTab({ dataset }: { dataset: ParsedDataset }) {
    const TYPE_COLOR: Record<string, string> = {
        number: "#34d399", date: "#60a5fa", boolean: "#f59e0b", string: "#a78bfa", mixed: "#f87171",
    };

    return (
        <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
            {/* Summary row */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(140px,1fr))", gap: "10px" }}>
                {[
                    { label: "Total Rows", val: dataset.totalRows.toLocaleString(), color: ACCENT },
                    { label: "Columns", val: dataset.columns.length, color: "#a78bfa" },
                    { label: "Format", val: dataset.format.toUpperCase(), color: "#f59e0b" },
                    { label: "Null Issues", val: dataset.stats.filter(s => s.nullPct > 0).length, color: "#f87171" },
                ].map(item => (
                    <div key={item.label} style={{ ...card, padding: "14px 16px" }}>
                        <p style={{ ...label, margin: "0 0 6px" }}>{item.label}</p>
                        <p style={{ fontSize: "20px", fontWeight: 800, color: item.color, margin: 0, letterSpacing: "-0.02em" }}>{String(item.val)}</p>
                    </div>
                ))}
            </div>

            {/* Column analysis table */}
            <div style={{ ...card, padding: "18px 20px" }}>
                <p style={{ ...label, margin: "0 0 14px", paddingBottom: "10px", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>Column Analysis</p>
                <div style={{ overflowX: "auto", borderRadius: "10px", border: "1px solid rgba(255,255,255,0.07)" }}>
                    <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "12px" }}>
                        <thead>
                            <tr style={{ background: "rgba(255,255,255,0.03)" }}>
                                {["Column", "Type", "Nulls %", "Distinct", "Range / Samples", "Quality"].map(h => (
                                    <th key={h} style={{ padding: "9px 12px", textAlign: "left", fontSize: "10px", fontWeight: 700, color: "#6B7280", textTransform: "uppercase", letterSpacing: "0.07em", whiteSpace: "nowrap" }}>{h}</th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {dataset.stats.map(col => (
                                <tr key={col.name} style={{ borderTop: "1px solid rgba(255,255,255,0.05)" }}
                                    onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = "rgba(255,255,255,0.02)"}
                                    onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = "transparent"}
                                >
                                    <td style={{ padding: "9px 12px", fontFamily: "monospace", fontWeight: 700, color: "var(--text-primary)", whiteSpace: "nowrap" }}>{col.name}</td>
                                    <td style={{ padding: "9px 12px" }}>
                                        <span style={{ fontSize: "10px", fontWeight: 700, padding: "2px 8px", borderRadius: "20px", background: `${TYPE_COLOR[col.type] ?? "#6B7280"}18`, color: TYPE_COLOR[col.type] ?? "#6B7280", border: `1px solid ${TYPE_COLOR[col.type] ?? "#6B7280"}30` }}>{col.type}</span>
                                    </td>
                                    <td style={{ padding: "9px 12px" }}>
                                        <div style={{ display: "flex", flexDirection: "column", gap: "3px" }}>
                                            <span style={{ fontWeight: 700, color: col.nullPct > 50 ? "#f87171" : col.nullPct > 20 ? "#f59e0b" : "#D1D5DB" }}>{col.nullPct}%</span>
                                            <div style={{ width: "60px", height: "4px", background: "rgba(255,255,255,0.06)", borderRadius: "2px" }}>
                                                <div style={{ height: "100%", width: `${Math.min(col.nullPct, 100)}%`, background: col.nullPct > 50 ? "#f87171" : col.nullPct > 20 ? "#f59e0b" : "#10b981", borderRadius: "2px" }} />
                                            </div>
                                        </div>
                                    </td>
                                    <td style={{ padding: "9px 12px", color: "var(--text-secondary)", fontFamily: "monospace" }}>{col.distinctCount.toLocaleString()}</td>
                                    <td style={{ padding: "9px 12px", maxWidth: "200px" }}>
                                        {col.min !== undefined
                                            ? <span style={{ fontSize: "11px", color: "#a78bfa", fontFamily: "monospace" }}>{col.min.toLocaleString()} – {col.max?.toLocaleString()} (avg {col.avg?.toFixed(1)})</span>
                                            : col.minDate
                                            ? <span style={{ fontSize: "11px", color: "#60a5fa", fontFamily: "monospace" }}>{col.minDate} → {col.maxDate}</span>
                                            : <span style={{ fontSize: "11px", color: "#6B7280" }}>{col.sampleValues.slice(0, 3).join(", ")}</span>
                                        }
                                    </td>
                                    <td style={{ padding: "9px 12px" }}>
                                        {col.nullPct > 50
                                            ? <span style={{ fontSize: "10px", fontWeight: 700, padding: "2px 7px", borderRadius: "4px", background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.2)", color: "#f87171" }}>⚠ High Nulls</span>
                                            : col.nullPct > 0
                                            ? <span style={{ fontSize: "10px", fontWeight: 700, padding: "2px 7px", borderRadius: "4px", background: "rgba(245,158,11,0.1)", border: "1px solid rgba(245,158,11,0.2)", color: "#f59e0b" }}>Some Nulls</span>
                                            : <span style={{ fontSize: "10px", fontWeight: 700, padding: "2px 7px", borderRadius: "4px", background: "rgba(16,185,129,0.1)", border: "1px solid rgba(16,185,129,0.2)", color: "#34d399" }}>✓ Clean</span>
                                        }
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* PDF raw text */}
            {dataset.format === "pdf" && dataset.text && (
                <div style={{ ...card, padding: "18px 20px" }}>
                    <p style={{ ...label, margin: "0 0 10px" }}>Extracted PDF Text (first 3000 chars)</p>
                    <pre style={{ fontSize: "11px", color: "#9CA3AF", lineHeight: 1.7, margin: 0, whiteSpace: "pre-wrap", wordBreak: "break-word", maxHeight: "300px", overflowY: "auto" }}>
                        {dataset.text.slice(0, 3000)}
                    </pre>
                </div>
            )}
        </div>
    );
}

// ── Compare tab ───────────────────────────────────────────────────────────────
function CompareTab({ datasetA, datasetB, onLoadB, loadingB, dbConnected, dbTables }: {
    datasetA: ParsedDataset | null; datasetB: ParsedDataset | null;
    onLoadB: (f: File) => void; loadingB: boolean;
    dbConnected: boolean | null; dbTables: string[];
}) {
    const [matchColumn, setMatchColumn] = useState("");
    const [fuzzyThreshold, setFuzzyThreshold] = useState(85);
    const [mode, setMode] = useState<"file-file" | "file-db">("file-file");
    const [dbTable, setDbTable] = useState("");
    const [running, setRunning] = useState(false);
    const [result, setResult] = useState<CompareResult | null>(null);
    const [err, setErr] = useState<string | null>(null);
    const [activeResultTab, setActiveResultTab] = useState<"summary" | "matches" | "conflicts" | "onlyA" | "onlyB">("summary");

    useEffect(() => {
        if (datasetA?.columns.length) setMatchColumn(datasetA.columns[0]);
    }, [datasetA]);

    const runCompare = async () => {
        if (!datasetA) return;
        setRunning(true); setErr(null); setResult(null);
        try {
            const body: any = { mode, datasetA: { ...datasetA, rows: datasetA.rows }, matchColumn, fuzzyThreshold };
            if (mode === "file-file") {
                if (!datasetB) throw new Error("Upload Dataset B first");
                body.datasetB = datasetB;
            } else {
                if (!dbTable) throw new Error("Select a database table");
                body.dbTable = dbTable;
            }
            const res = await fetch("/api/autoflow/compare", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || "Compare failed");
            setResult(data);
            setActiveResultTab("summary");
        } catch (e: any) { setErr(e.message); }
        finally { setRunning(false); }
    };

    const btnStyle = (active: boolean): React.CSSProperties => ({
        padding: "7px 14px", borderRadius: "8px", fontSize: "12px", fontWeight: 600, cursor: "pointer",
        background: active ? `${ACCENT}18` : "transparent",
        border: `1px solid ${active ? ACCENT + "44" : "transparent"}`,
        color: active ? ACCENT : "#6B7280", transition: "all 0.15s",
    });

    return (
        <div style={{ display: "flex", flexDirection: "column", gap: "18px" }}>
            {!datasetA && (
                <div style={{ ...card, padding: "24px", textAlign: "center" }}>
                    <p style={{ fontSize: "13px", color: "#6B7280", margin: 0 }}>Upload Dataset A in the <strong style={{ color: "var(--text-primary)" }}>Extract</strong> tab first.</p>
                </div>
            )}

            {datasetA && (
                <>
                    {/* Mode selector */}
                    <div style={{ ...card, padding: "18px 20px", display: "flex", flexDirection: "column", gap: "14px" }}>
                        <p style={{ ...label, margin: 0 }}>Comparison Mode</p>
                        <div style={{ display: "flex", gap: "8px" }}>
                            <button onClick={() => setMode("file-file")} style={btnStyle(mode === "file-file")}>File vs File</button>
                            <button onClick={() => setMode("file-db")} disabled={!dbConnected}
                                style={{ ...btnStyle(mode === "file-db"), cursor: !dbConnected ? "not-allowed" : "pointer", opacity: !dbConnected ? 0.5 : 1 }}>
                                File vs Database {!dbConnected && "(no DB connected)"}
                            </button>
                        </div>

                        {mode === "file-file" && !datasetB && (
                            <DropZone onFile={onLoadB} loading={loadingB} label="Upload Dataset B" slot="B" />
                        )}
                        {mode === "file-file" && datasetB && (
                            <div style={{ display: "flex", alignItems: "center", gap: "10px", padding: "10px 14px", background: "rgba(167,139,250,0.06)", border: "1px solid rgba(167,139,250,0.2)", borderRadius: "8px" }}>
                                <span style={{ fontSize: "20px" }}>📄</span>
                                <div>
                                    <p style={{ fontSize: "12px", fontWeight: 700, color: "var(--text-primary)", margin: 0 }}>{datasetB.fileName}</p>
                                    <p style={{ fontSize: "10px", color: "#6B7280", margin: 0 }}>{datasetB.totalRows.toLocaleString()} rows · {datasetB.columns.length} columns</p>
                                </div>
                                <button onClick={() => onLoadB(new File([], ""))} style={{ marginLeft: "auto", fontSize: "11px", color: "#f87171", background: "none", border: "none", cursor: "pointer" }}>Replace</button>
                            </div>
                        )}
                        {mode === "file-db" && (
                            <div>
                                <label style={{ ...label, display: "block", marginBottom: "6px" }}>Database Table</label>
                                <select value={dbTable} onChange={e => setDbTable(e.target.value)}
                                    style={{ background: "var(--bg-base)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "8px", color: "var(--text-primary)", padding: "8px 12px", fontSize: "12px", width: "100%", outline: "none" }}>
                                    <option value="">Select a table…</option>
                                    {dbTables.map(t => <option key={t} value={t}>{t}</option>)}
                                </select>
                            </div>
                        )}
                    </div>

                    {/* Match config */}
                    <div style={{ ...card, padding: "18px 20px", display: "grid", gridTemplateColumns: "1fr 1fr", gap: "14px" }}>
                        <div>
                            <label style={{ ...label, display: "block", marginBottom: "6px" }}>Match Key Column (Dataset A)</label>
                            <select value={matchColumn} onChange={e => setMatchColumn(e.target.value)}
                                style={{ background: "var(--bg-base)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "8px", color: "var(--text-primary)", padding: "8px 12px", fontSize: "12px", width: "100%", outline: "none" }}>
                                {datasetA.columns.map(c => <option key={c} value={c}>{c}</option>)}
                            </select>
                        </div>
                        <div>
                            <label style={{ ...label, display: "block", marginBottom: "6px" }}>Fuzzy Match Threshold: {fuzzyThreshold}%</label>
                            <input type="range" min={50} max={100} value={fuzzyThreshold} onChange={e => setFuzzyThreshold(Number(e.target.value))}
                                style={{ width: "100%", accentColor: ACCENT }} />
                            <div style={{ display: "flex", justifyContent: "space-between", fontSize: "10px", color: "#4B5563" }}><span>50% (loose)</span><span>100% (exact)</span></div>
                        </div>
                    </div>

                    <button onClick={runCompare} disabled={running || (mode === "file-file" && !datasetB) || (mode === "file-db" && !dbTable)}
                        style={{ padding: "11px 28px", borderRadius: "10px", fontSize: "13px", fontWeight: 700, background: running ? "rgba(6,182,212,0.3)" : `linear-gradient(135deg,${ACCENT},${ACCENT2})`, border: "none", color: "#fff", cursor: running ? "not-allowed" : "pointer", display: "flex", alignItems: "center", gap: "8px", boxShadow: running ? "none" : `0 4px 14px ${ACCENT}40`, width: "fit-content" }}>
                        {running && <Spinner size={13} color="#fff" />}
                        {running ? "Comparing…" : "Run Comparison"}
                    </button>

                    {err && <div style={{ background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.2)", borderRadius: "10px", padding: "12px 16px", fontSize: "12px", color: "#f87171" }}>⚠ {err}</div>}
                </>
            )}

            {result && <CompareResults result={result} activeTab={activeResultTab} setActiveTab={setActiveResultTab} />}
        </div>
    );
}

// ── Compare Results ───────────────────────────────────────────────────────────
function CompareResults({ result, activeTab, setActiveTab }: {
    result: CompareResult;
    activeTab: string;
    setActiveTab: (t: any) => void;
}) {
    const s = result.summary;

    const RESULT_TABS = [
        { id: "summary",   label: "Summary",     count: null },
        { id: "matches",   label: "Matches",     count: s.totalMatches },
        { id: "conflicts", label: "Conflicts",   count: s.conflicts },
        { id: "onlyA",     label: "Only in A",   count: s.onlyInA },
        { id: "onlyB",     label: "Only in B",   count: s.onlyInB },
    ];

    return (
        <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
            {/* Tab bar */}
            <div style={{ display: "flex", gap: "6px", borderBottom: "1px solid rgba(255,255,255,0.06)", paddingBottom: "10px", flexWrap: "wrap" }}>
                {RESULT_TABS.map(t => (
                    <button key={t.id} onClick={() => setActiveTab(t.id)} style={{
                        padding: "6px 14px", borderRadius: "8px", fontSize: "12px", fontWeight: 600, cursor: "pointer",
                        background: activeTab === t.id ? `${ACCENT}18` : "transparent",
                        border: `1px solid ${activeTab === t.id ? ACCENT + "44" : "transparent"}`,
                        color: activeTab === t.id ? ACCENT : "#6B7280",
                    }}>
                        {t.label}{t.count !== null ? ` (${t.count})` : ""}
                    </button>
                ))}
            </div>

            {/* Summary */}
            {activeTab === "summary" && (
                <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(130px,1fr))", gap: "10px" }}>
                        {[
                            { label: "Match Rate",     val: `${s.matchRate}%`,      color: s.matchRate > 80 ? "#34d399" : s.matchRate > 50 ? "#f59e0b" : "#f87171" },
                            { label: "Exact Matches",  val: s.exactMatches,         color: "#34d399" },
                            { label: "Fuzzy Matches",  val: s.fuzzyMatches,         color: "#f59e0b" },
                            { label: "Conflicts",      val: s.conflicts,            color: s.conflicts > 0 ? "#f87171" : "#34d399" },
                            { label: "Only in A",      val: s.onlyInA,              color: "#a78bfa" },
                            { label: "Only in B",      val: s.onlyInB,              color: "#60a5fa" },
                        ].map(item => (
                            <div key={item.label} style={{ ...card, padding: "14px 16px" }}>
                                <p style={{ ...label, margin: "0 0 5px" }}>{item.label}</p>
                                <p style={{ fontSize: "22px", fontWeight: 800, color: item.color, margin: 0, letterSpacing: "-0.02em" }}>{String(item.val)}</p>
                            </div>
                        ))}
                    </div>
                    <div style={{ ...card, padding: "14px 18px" }}>
                        <p style={{ fontSize: "12px", color: "#6B7280", margin: 0 }}>
                            <strong style={{ color: "var(--text-primary)" }}>{result.meta.fileNameA}</strong> ({s.totalA.toLocaleString()} rows) vs{" "}
                            <strong style={{ color: "var(--text-primary)" }}>{result.meta.fileNameB}</strong> ({s.totalB.toLocaleString()} rows) ·
                            Matched on <code style={{ color: ACCENT, background: `${ACCENT}12`, padding: "1px 6px", borderRadius: "4px" }}>{result.meta.matchColumn}</code> ·
                            Threshold {result.meta.fuzzyThreshold}%
                        </p>
                    </div>
                </div>
            )}

            {/* Matches */}
            {activeTab === "matches" && (
                <RowTable rows={result.matches.map(m => ({
                    "Key A": m.keyA, "Key B": m.keyB,
                    "Score": `${m.score}%`, "Type": m.matchType,
                    "Diffs": m.diffs.length > 0 ? `${m.diffs.length} column(s)` : "—",
                }))} accentCol="Score" />
            )}

            {/* Conflicts */}
            {activeTab === "conflicts" && (
                result.conflicts.length === 0
                    ? <div style={{ ...card, padding: "28px", textAlign: "center" }}><p style={{ color: "#34d399", margin: 0, fontWeight: 700 }}>✓ No conflicts found — all matched values are identical.</p></div>
                    : <RowTable rows={result.conflicts.map((c: any) => ({ "Key A": c.keyA, "Column": c.column, "Value A": String(c.valueA ?? ""), "Value B": String(c.valueB ?? ""), "Score": `${c.score}%` }))} accentCol="Column" />
            )}

            {/* Only in A */}
            {activeTab === "onlyA" && (
                result.onlyInA.length === 0
                    ? <div style={{ ...card, padding: "28px", textAlign: "center" }}><p style={{ color: "#34d399", margin: 0 }}>All rows in A were matched.</p></div>
                    : <RowTable rows={result.onlyInA} accentCol={result.meta.matchColumn} />
            )}

            {/* Only in B */}
            {activeTab === "onlyB" && (
                result.onlyInB.length === 0
                    ? <div style={{ ...card, padding: "28px", textAlign: "center" }}><p style={{ color: "#34d399", margin: 0 }}>All rows in B were matched.</p></div>
                    : <RowTable rows={result.onlyInB} accentCol={result.meta.matchColumn} />
            )}
        </div>
    );
}

function RowTable({ rows, accentCol }: { rows: Record<string, any>[]; accentCol?: string }) {
    const cols = Object.keys(rows[0] ?? {}).slice(0, 8);
    const [page, setPage] = useState(0);
    const PAGE = 20;
    const total = Math.ceil(rows.length / PAGE);
    const visible = rows.slice(page * PAGE, (page + 1) * PAGE);

    return (
        <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
            <div style={{ overflowX: "auto", borderRadius: "10px", border: "1px solid rgba(255,255,255,0.07)" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "11px" }}>
                    <thead>
                        <tr style={{ background: "rgba(255,255,255,0.03)" }}>
                            {cols.map(c => (
                                <th key={c} style={{ padding: "8px 12px", textAlign: "left", fontSize: "10px", fontWeight: 700, color: c === accentCol ? ACCENT : "#6B7280", textTransform: "uppercase", letterSpacing: "0.06em", whiteSpace: "nowrap" }}>{c}</th>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        {visible.map((row, i) => (
                            <tr key={i} style={{ borderTop: "1px solid rgba(255,255,255,0.04)" }}
                                onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = "rgba(255,255,255,0.02)"}
                                onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = "transparent"}
                            >
                                {cols.map(c => (
                                    <td key={c} style={{ padding: "8px 12px", color: c === accentCol ? ACCENT : "#D1D5DB", maxWidth: "180px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", fontFamily: "monospace" }}>
                                        {String(row[c] ?? "—")}
                                    </td>
                                ))}
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
            {total > 1 && (
                <div style={{ display: "flex", alignItems: "center", gap: "8px", justifyContent: "center" }}>
                    <button onClick={() => setPage(p => Math.max(0, p - 1))} disabled={page === 0} style={{ padding: "4px 12px", borderRadius: "6px", fontSize: "11px", background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.1)", color: "#9CA3AF", cursor: page === 0 ? "not-allowed" : "pointer" }}>←</button>
                    <span style={{ fontSize: "11px", color: "#6B7280" }}>{page + 1} / {total} ({rows.length} rows)</span>
                    <button onClick={() => setPage(p => Math.min(total - 1, p + 1))} disabled={page >= total - 1} style={{ padding: "4px 12px", borderRadius: "6px", fontSize: "11px", background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.1)", color: "#9CA3AF", cursor: page >= total - 1 ? "not-allowed" : "pointer" }}>→</button>
                </div>
            )}
        </div>
    );
}

// ── AI Insights tab ───────────────────────────────────────────────────────────
function InsightsTab({ dataset }: { dataset: ParsedDataset | null }) {
    const [question, setQuestion] = useState("");
    const [insights, setInsights] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);
    const [err, setErr] = useState<string | null>(null);

    const run = async () => {
        if (!dataset) return;
        setLoading(true); setErr(null); setInsights(null);
        try {
            const res = await fetch("/api/autoflow/ai-insights", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    fileName: dataset.fileName,
                    format: dataset.format,
                    columns: dataset.columns,
                    stats: dataset.stats,
                    sampleRows: dataset.rows.slice(0, 20),
                    totalRows: dataset.totalRows,
                    pdfText: dataset.text,
                    question: question.trim() || undefined,
                }),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || "AI analysis failed");
            setInsights(data.insights);
        } catch (e: any) { setErr(e.message); }
        finally { setLoading(false); }
    };

    if (!dataset) {
        return (
            <div style={{ ...card, padding: "40px", textAlign: "center" }}>
                <p style={{ fontSize: "13px", color: "#6B7280", margin: 0 }}>
                    Upload a file in the <strong style={{ color: "var(--text-primary)" }}>Extract</strong> tab to unlock AI analysis.
                </p>
            </div>
        );
    }

    // Parse markdown-ish response into sections
    const renderInsights = (text: string) => {
        const lines = text.split("\n");
        return lines.map((line, i) => {
            if (line.startsWith("##") || line.match(/^\d+\.\s+\*\*/)) {
                const cleaned = line.replace(/^#+\s*/, "").replace(/\*\*/g, "");
                return <p key={i} style={{ fontSize: "13px", fontWeight: 800, color: ACCENT, margin: "16px 0 6px", letterSpacing: "-0.01em" }}>{cleaned}</p>;
            }
            if (line.startsWith("**") && line.endsWith("**")) {
                return <p key={i} style={{ fontSize: "13px", fontWeight: 700, color: "var(--text-primary)", margin: "12px 0 4px" }}>{line.replace(/\*\*/g, "")}</p>;
            }
            if (line.startsWith("- ") || line.startsWith("• ")) {
                return <p key={i} style={{ fontSize: "12px", color: "#D1D5DB", margin: "3px 0 3px 12px", lineHeight: 1.6 }}>· {line.slice(2)}</p>;
            }
            if (!line.trim()) return <div key={i} style={{ height: "6px" }} />;
            return <p key={i} style={{ fontSize: "12px", color: "#D1D5DB", margin: "4px 0", lineHeight: 1.65 }}>{line.replace(/\*\*(.*?)\*\*/g, "$1")}</p>;
        });
    };

    const QUICK_QUESTIONS = [
        "What data quality issues should I fix first?",
        "What are the most important patterns in this data?",
        "How should I clean and prepare this data for analysis?",
        "What business insights can you derive from this data?",
    ];

    return (
        <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
            {/* Dataset context pill */}
            <div style={{ display: "flex", alignItems: "center", gap: "10px", padding: "10px 14px", background: `${ACCENT}0a`, border: `1px solid ${ACCENT}22`, borderRadius: "8px" }}>
                <span style={{ fontSize: "18px" }}>{dataset.format === "pdf" ? "📄" : dataset.format === "excel" ? "📊" : "📋"}</span>
                <div>
                    <p style={{ fontSize: "12px", fontWeight: 700, color: "var(--text-primary)", margin: 0 }}>{dataset.fileName}</p>
                    <p style={{ fontSize: "10px", color: "#6B7280", margin: 0 }}>{dataset.totalRows.toLocaleString()} rows · {dataset.columns.length} columns · {dataset.format.toUpperCase()}</p>
                </div>
            </div>

            {/* Quick question chips */}
            <div>
                <p style={{ ...label, margin: "0 0 8px" }}>Quick Questions</p>
                <div style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}>
                    {QUICK_QUESTIONS.map(q => (
                        <button key={q} onClick={() => setQuestion(q)}
                            style={{ padding: "5px 12px", borderRadius: "20px", fontSize: "11px", fontWeight: 500, background: question === q ? `${ACCENT}18` : "rgba(255,255,255,0.04)", border: `1px solid ${question === q ? ACCENT + "44" : "rgba(255,255,255,0.1)"}`, color: question === q ? ACCENT : "#9CA3AF", cursor: "pointer", transition: "all 0.15s" }}>
                            {q}
                        </button>
                    ))}
                </div>
            </div>

            {/* Custom question */}
            <div style={{ display: "flex", gap: "8px" }}>
                <input
                    value={question}
                    onChange={e => setQuestion(e.target.value)}
                    placeholder="Ask anything about this dataset… (or leave blank for full analysis)"
                    style={{ flex: 1, background: "var(--bg-base)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: "9px", color: "var(--text-primary)", padding: "10px 14px", fontSize: "13px", fontFamily: "inherit", outline: "none" }}
                    onFocus={e => (e.currentTarget.style.borderColor = ACCENT)}
                    onBlur={e => (e.currentTarget.style.borderColor = "rgba(255,255,255,0.08)")}
                    onKeyDown={e => e.key === "Enter" && !loading && run()}
                />
                <button onClick={run} disabled={loading}
                    style={{ padding: "10px 22px", borderRadius: "9px", fontSize: "13px", fontWeight: 700, background: loading ? `${ACCENT}40` : `linear-gradient(135deg,${ACCENT},${ACCENT2})`, border: "none", color: "#fff", cursor: loading ? "not-allowed" : "pointer", display: "flex", alignItems: "center", gap: "7px", boxShadow: loading ? "none" : `0 4px 14px ${ACCENT}40`, whiteSpace: "nowrap" }}>
                    {loading && <Spinner size={13} color="#fff" />}
                    {loading ? "Analyzing…" : "Analyze"}
                </button>
            </div>

            {err && <div style={{ background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.2)", borderRadius: "10px", padding: "12px 16px", fontSize: "12px", color: "#f87171" }}>⚠ {err}</div>}

            {insights && (
                <div style={{ ...card, padding: "22px 24px", display: "flex", flexDirection: "column", gap: "4px" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "12px", paddingBottom: "12px", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
                        <div style={{ width: "8px", height: "8px", borderRadius: "50%", background: ACCENT }} />
                        <span style={{ fontSize: "13px", fontWeight: 700, color: "var(--text-primary)" }}>AI Analysis Report</span>
                        <button onClick={() => navigator.clipboard.writeText(insights)}
                            style={{ marginLeft: "auto", padding: "4px 10px", borderRadius: "6px", fontSize: "10px", fontWeight: 600, background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.1)", color: "#6B7280", cursor: "pointer" }}>
                            Copy
                        </button>
                    </div>
                    <div style={{ lineHeight: 1.65 }}>{renderInsights(insights)}</div>
                </div>
            )}
        </div>
    );
}

// ── Main page ─────────────────────────────────────────────────────────────────
export default function DataAutoFlowPage() {
    const { dbConnected } = useDatabase();

    const [activeTab, setActiveTab] = useState<Tab>("extract");

    // Dataset A (primary)
    const [datasetA, setDatasetA] = useState<ParsedDataset | null>(null);
    const [loadingA, setLoadingA] = useState(false);
    const [errorA, setErrorA] = useState<string | null>(null);

    // Dataset B (comparison)
    const [datasetB, setDatasetB] = useState<ParsedDataset | null>(null);
    const [loadingB, setLoadingB] = useState(false);

    // DB tables for file-db compare
    const [dbTables, setDbTables] = useState<string[]>([]);

    // Load DB table names when connected
    useEffect(() => {
        if (!dbConnected) return;
        fetch("/api/schema").then(r => r.ok ? r.json() : null).then(d => {
            if (d?.tables) setDbTables(d.tables.map((t: any) => t.name));
        }).catch(() => {});
    }, [dbConnected]);

    const parseFile = useCallback(async (file: File, slot: "A" | "B") => {
        if (!file.name) return; // empty sentinel from "Replace" click
        const setLoading = slot === "A" ? setLoadingA : setLoadingB;
        const setDataset = slot === "A" ? setDatasetA : setDatasetB;
        const setError = slot === "A" ? setErrorA : () => {};

        setLoading(true);
        if (slot === "A") setErrorA(null);

        try {
            const form = new FormData();
            form.append("file", file);
            const res = await fetch("/api/autoflow/parse", { method: "POST", body: form });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || "Parse failed");
            setDataset(data);
            if (slot === "A") setActiveTab("profile");
        } catch (e: any) {
            setError(e.message);
        } finally {
            setLoading(false);
        }
    }, []);

    const tabBtnStyle = (t: Tab): React.CSSProperties => ({
        padding: "9px 18px", borderRadius: "9px", fontSize: "12px", fontWeight: 600,
        cursor: "pointer", transition: "all 0.15s", border: "1px solid",
        background: activeTab === t ? `${ACCENT}18` : "transparent",
        borderColor: activeTab === t ? `${ACCENT}44` : "transparent",
        color: activeTab === t ? ACCENT : "#6B7280",
    });

    return (
        <div style={{ maxWidth: "1100px", margin: "0 auto", display: "flex", flexDirection: "column", gap: "24px", paddingBottom: "40px" }}>
            <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>

            {/* ── Header ── */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "12px" }}>
                <div>
                    <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "6px" }}>
                        <div style={{ width: "36px", height: "36px", borderRadius: "10px", background: `linear-gradient(135deg,${ACCENT},${ACCENT2})`, display: "flex", alignItems: "center", justifyContent: "center" }}>
                            <svg width="18" height="18" fill="none" stroke="white" strokeWidth="2" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M7.5 21L3 16.5m0 0L7.5 12M3 16.5h13.5m0-13.5L21 7.5m0 0L16.5 12M21 7.5H7.5" />
                            </svg>
                        </div>
                        <h1 style={{ fontSize: "22px", fontWeight: 800, color: "var(--text-primary)", margin: 0, letterSpacing: "-0.03em" }}>
                            Data AutoFlow
                        </h1>
                        <span style={{ fontSize: "10px", fontWeight: 700, padding: "2px 8px", borderRadius: "20px", background: `${ACCENT}18`, color: ACCENT, border: `1px solid ${ACCENT}30`, textTransform: "uppercase", letterSpacing: "0.08em" }}>
                            Pipeline
                        </span>
                    </div>
                    <p style={{ fontSize: "13px", color: "#6B7280", margin: 0 }}>
                        Automated data extraction, profiling, and comparison across CSV, Excel, and PDF formats.
                    </p>
                </div>

                {/* Pipeline steps indicator */}
                <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                    {["Upload", "Profile", "Compare", "Insights"].map((step, i) => (
                        <React.Fragment key={step}>
                            <div style={{ display: "flex", alignItems: "center", gap: "5px", padding: "5px 10px", borderRadius: "20px", background: i === ["extract","profile","compare","insights"].indexOf(activeTab) ? `${ACCENT}18` : "rgba(255,255,255,0.03)", border: `1px solid ${i === ["extract","profile","compare","insights"].indexOf(activeTab) ? ACCENT + "30" : "rgba(255,255,255,0.06)"}` }}>
                                <span style={{ width: "16px", height: "16px", borderRadius: "50%", background: i <= ["extract","profile","compare","insights"].indexOf(activeTab) ? ACCENT : "rgba(255,255,255,0.1)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "9px", fontWeight: 700, color: i <= ["extract","profile","compare","insights"].indexOf(activeTab) ? "#000" : "#4B5563" }}>{i + 1}</span>
                                <span style={{ fontSize: "10px", fontWeight: 600, color: i === ["extract","profile","compare","insights"].indexOf(activeTab) ? ACCENT : "#4B5563" }}>{step}</span>
                            </div>
                            {i < 3 && <svg width="12" height="12" fill="none" stroke="#374151" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" /></svg>}
                        </React.Fragment>
                    ))}
                </div>
            </div>

            {/* ── Tab navigation ── */}
            <div style={{ display: "flex", gap: "6px", borderBottom: "1px solid rgba(255,255,255,0.06)", paddingBottom: "14px", flexWrap: "wrap" }}>
                {TABS.map(t => (
                    <button key={t.id} onClick={() => setActiveTab(t.id)} style={tabBtnStyle(t.id)}>
                        {t.label}
                        <span style={{ fontSize: "10px", color: "#4B5563", marginLeft: "4px", display: activeTab === t.id ? "inline" : "none" }}>— {t.desc}</span>
                    </button>
                ))}
            </div>

            {/* ── Extract tab ── */}
            {activeTab === "extract" && (
                <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
                    {/* Feature pills */}
                    <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
                        {[
                            { icon: "📋", label: "CSV / TSV" },
                            { icon: "📊", label: "Excel (.xlsx / .xls)" },
                            { icon: "📄", label: "PDF (text extraction)" },
                            { icon: "🔢", label: "Up to 20 MB" },
                            { icon: "🔍", label: "Auto column profiling" },
                        ].map(f => (
                            <span key={f.label} style={{ display: "inline-flex", alignItems: "center", gap: "5px", padding: "4px 12px", borderRadius: "20px", fontSize: "11px", fontWeight: 600, background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", color: "#9CA3AF" }}>
                                {f.icon} {f.label}
                            </span>
                        ))}
                    </div>

                    {/* Upload zone A */}
                    <div style={{ ...card, padding: "20px 22px", display: "flex", flexDirection: "column", gap: "16px" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                            <div style={{ width: "7px", height: "7px", borderRadius: "50%", background: ACCENT }} />
                            <span style={{ fontSize: "13px", fontWeight: 700, color: "var(--text-primary)" }}>Dataset A — Primary File</span>
                        </div>
                        <DropZone onFile={f => parseFile(f, "A")} loading={loadingA} label="Upload your primary dataset" slot="A" />
                        {errorA && <div style={{ background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.2)", borderRadius: "8px", padding: "10px 14px", fontSize: "12px", color: "#f87171" }}>⚠ {errorA}</div>}
                    </div>

                    {/* Preview after load */}
                    {datasetA && !loadingA && (
                        <div style={{ ...card, padding: "20px 22px", display: "flex", flexDirection: "column", gap: "14px" }}>
                            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "10px" }}>
                                <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                                    <span style={{ fontSize: "22px" }}>{datasetA.format === "pdf" ? "📄" : datasetA.format === "excel" ? "📊" : "📋"}</span>
                                    <div>
                                        <p style={{ fontSize: "13px", fontWeight: 700, color: "var(--text-primary)", margin: 0 }}>{datasetA.fileName}</p>
                                        <p style={{ fontSize: "11px", color: "#6B7280", margin: 0 }}>{datasetA.totalRows.toLocaleString()} rows · {datasetA.columns.length} columns</p>
                                    </div>
                                </div>
                                <div style={{ display: "flex", gap: "6px" }}>
                                    <button onClick={() => setActiveTab("profile")} style={{ padding: "6px 14px", borderRadius: "8px", fontSize: "11px", fontWeight: 700, background: `${ACCENT}18`, border: `1px solid ${ACCENT}30`, color: ACCENT, cursor: "pointer" }}>View Profile →</button>
                                    <button onClick={() => setActiveTab("insights")} style={{ padding: "6px 14px", borderRadius: "8px", fontSize: "11px", fontWeight: 700, background: "rgba(99,102,241,0.12)", border: "1px solid rgba(99,102,241,0.25)", color: "#818cf8", cursor: "pointer" }}>AI Insights →</button>
                                </div>
                            </div>
                            <DataPreview dataset={datasetA} accent={ACCENT} />
                        </div>
                    )}

                    {/* How it works */}
                    {!datasetA && !loadingA && (
                        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(220px,1fr))", gap: "12px" }}>
                            {[
                                { step: "1", title: "Upload", desc: "Drop any CSV, Excel, or PDF file. Data stays in your browser session.", color: ACCENT },
                                { step: "2", title: "Profile", desc: "Instant column stats: null rates, types, distributions, anomalies.", color: "#a78bfa" },
                                { step: "3", title: "Compare", desc: "Fuzzy-match two files or compare against your connected database.", color: "#f59e0b" },
                                { step: "4", title: "AI Insights", desc: "Ask questions and get LLM-powered analysis of your data.", color: "#34d399" },
                            ].map(s => (
                                <div key={s.step} style={{ ...card, padding: "18px 20px" }}>
                                    <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "8px" }}>
                                        <div style={{ width: "26px", height: "26px", borderRadius: "8px", background: `${s.color}18`, border: `1px solid ${s.color}30`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "12px", fontWeight: 800, color: s.color }}>{s.step}</div>
                                        <p style={{ fontSize: "13px", fontWeight: 700, color: "var(--text-primary)", margin: 0 }}>{s.title}</p>
                                    </div>
                                    <p style={{ fontSize: "11px", color: "#6B7280", margin: 0, lineHeight: 1.6 }}>{s.desc}</p>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}

            {/* ── Profile tab ── */}
            {activeTab === "profile" && (
                datasetA
                    ? <ProfileTab dataset={datasetA} />
                    : <div style={{ ...card, padding: "40px", textAlign: "center" }}><p style={{ color: "#6B7280", margin: 0, fontSize: "13px" }}>Upload a file in <strong style={{ color: "var(--text-primary)" }}>Extract</strong> to see profiling.</p></div>
            )}

            {/* ── Compare tab ── */}
            {activeTab === "compare" && (
                <CompareTab
                    datasetA={datasetA}
                    datasetB={datasetB}
                    onLoadB={f => parseFile(f, "B")}
                    loadingB={loadingB}
                    dbConnected={dbConnected}
                    dbTables={dbTables}
                />
            )}

            {/* ── Insights tab ── */}
            {activeTab === "insights" && <InsightsTab dataset={datasetA} />}
        </div>
    );
}
