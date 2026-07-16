"use client";
import React, { useState, useEffect, useCallback } from "react";

interface ColProfile {
    name: string; type: string; nullCount: number; nullPct: number;
    distinctCount: number; anomalies: string[];
    min?: number | null; max?: number | null; avg?: number | null;
    min_date?: string; max_date?: string;
    topValues?: { value: string; count: number }[];
}
interface TableProfile { tableName: string; totalRows: number; columns: ColProfile[]; }

const card = { background: "#0d0f1a", border: "1px solid rgba(255,255,255,0.08)", borderRadius: "14px" };
const S = { label: { fontSize: "11px", fontWeight: 700, color: "#6B7280", textTransform: "uppercase" as const, letterSpacing: "0.08em" } };

export default function DataProfilerPage() {
    const [tables, setTables] = useState<string[]>([]);
    const [selected, setSelected] = useState("");
    const [loadingTables, setLoadingTables] = useState(true);
    const [profiling, setProfiling] = useState(false);
    const [profile, setProfile] = useState<TableProfile | null>(null);
    const [headerErr, setHeaderErr] = useState<string | null>(null);
    const [profileErr, setProfileErr] = useState<string | null>(null);

    const runProfile = useCallback(async (table: string) => {
        if (!table) return;
        setProfiling(true); setProfileErr(null); setProfile(null);
        try {
            const res = await fetch("/api/profile", {
                method: "POST", headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ tableName: table }),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || "Profiling failed");
            setProfile(data);
        } catch (e: any) { setProfileErr(e.message); }
        finally { setProfiling(false); }
    }, []);

    useEffect(() => {
        fetch("/api/schema").then(r => r.json()).then(data => {
            const names = (data.tables || []).map((t: any) => t.name);
            setTables(names);
            if (names.length) { setSelected(names[0]); runProfile(names[0]); }
        }).catch(e => setHeaderErr(e.message)).finally(() => setLoadingTables(false));
    }, [runProfile]);

    return (
        <div style={{ display: "flex", flexDirection: "column", gap: "24px", maxWidth: "1100px", margin: "0 auto", width: "100%" }}>
            {/* Header */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "12px" }}>
                <div>
                    <h1 style={{ fontSize: "22px", fontWeight: 800, color: "#fff", margin: "0 0 4px", letterSpacing: "-0.03em" }}>Data Profiler</h1>
                    <p style={{ fontSize: "13px", color: "#6B7280", margin: 0 }}>Analyze null rates, cardinality, value distributions and anomalies for any table.</p>
                </div>
                {!loadingTables && tables.length > 0 && (
                    <div style={{ display: "flex", alignItems: "center", gap: "10px", ...card, padding: "10px 16px" }}>
                        <span style={S.label}>Table:</span>
                        <select value={selected}
                            onChange={e => { setSelected(e.target.value); runProfile(e.target.value); }}
                            disabled={profiling}
                            style={{ background: "#080a12", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "8px", color: "#fff", padding: "6px 12px", fontSize: "12px", fontFamily: "monospace", outline: "none", cursor: "pointer" }}
                        >
                            {tables.map(t => <option key={t} value={t}>{t}</option>)}
                        </select>
                        <button onClick={() => runProfile(selected)} disabled={profiling}
                            style={{ padding: "7px 16px", borderRadius: "8px", fontSize: "12px", fontWeight: 700, background: "rgba(99,102,241,0.12)", border: "1px solid rgba(99,102,241,0.25)", color: "#818cf8", cursor: profiling ? "not-allowed" : "pointer", transition: "all 0.15s" }}
                            onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = "rgba(99,102,241,0.2)"}
                            onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = "rgba(99,102,241,0.12)"}
                        >
                            {profiling ? "Profiling…" : "↻ Reload"}
                        </button>
                    </div>
                )}
            </div>

            {/* States */}
            {loadingTables && <div style={{ display: "flex", alignItems: "center", gap: "10px", justifyContent: "center", padding: "60px 0", color: "#6B7280", fontSize: "13px" }}><div style={{ width: "18px", height: "18px", border: "2px solid rgba(99,102,241,0.2)", borderTop: "2px solid #6366f1", borderRadius: "50%", animation: "spin 0.7s linear infinite" }} />Loading tables…</div>}
            {headerErr && <div style={{ background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.2)", borderRadius: "12px", padding: "12px 16px", fontSize: "12px", color: "#f87171" }}>⚠ {headerErr}</div>}
            {profiling && <div style={{ display: "flex", alignItems: "center", gap: "10px", justifyContent: "center", padding: "60px 0", color: "#6B7280", fontSize: "13px" }}><div style={{ width: "18px", height: "18px", border: "2px solid rgba(99,102,241,0.2)", borderTop: "2px solid #6366f1", borderRadius: "50%", animation: "spin 0.7s linear infinite" }} />Running analysis on "{selected}"…</div>}
            {profileErr && <div style={{ background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.2)", borderRadius: "12px", padding: "12px 16px", fontSize: "12px", color: "#f87171" }}>⚠ {profileErr}</div>}

            {profile && !profiling && (
                <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
                    {/* Summary cards */}
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "14px" }}>
                        {[
                            { label: "Table", value: profile.tableName, mono: true, color: "#818cf8" },
                            { label: "Total Rows", value: profile.totalRows.toLocaleString(), color: "#34d399" },
                            { label: "Columns", value: profile.columns.length, color: "#f59e0b" },
                        ].map(c => (
                            <div key={c.label} style={{ ...card, padding: "18px 20px" }}>
                                <p style={{ ...S.label, margin: "0 0 6px" }}>{c.label}</p>
                                <p style={{ fontSize: c.label === "Table" ? "14px" : "26px", fontWeight: 800, color: c.color, margin: 0, fontFamily: c.mono ? "monospace" : "inherit", wordBreak: "break-all" }}>{String(c.value)}</p>
                            </div>
                        ))}
                    </div>

                    {/* Columns table */}
                    <div style={{ ...card, padding: "20px 22px" }}>
                        <p style={{ ...S.label, margin: "0 0 14px", paddingBottom: "10px", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>Column Analysis</p>
                        <div style={{ overflowX: "auto", borderRadius: "10px", border: "1px solid rgba(255,255,255,0.07)" }}>
                            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "12px" }}>
                                <thead>
                                    <tr style={{ background: "rgba(255,255,255,0.03)" }}>
                                        {["Column", "Type", "Nulls %", "Distinct", "Quality"].map(h => (
                                            <th key={h} style={{ padding: "10px 14px", textAlign: "left", fontSize: "10px", fontWeight: 700, color: "#6B7280", textTransform: "uppercase", letterSpacing: "0.07em" }}>{h}</th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody>
                                    {profile.columns.map(col => (
                                        <tr key={col.name} style={{ borderTop: "1px solid rgba(255,255,255,0.05)", transition: "background 0.1s" }}
                                            onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = "rgba(255,255,255,0.02)"}
                                            onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = "transparent"}
                                        >
                                            <td style={{ padding: "10px 14px", fontFamily: "monospace", fontWeight: 700, color: "#fff" }}>{col.name}</td>
                                            <td style={{ padding: "10px 14px", fontFamily: "monospace", color: "#22d3ee" }}>{col.type}</td>
                                            <td style={{ padding: "10px 14px" }}>
                                                <div style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
                                                    <span style={{ fontWeight: 700, color: col.nullPct > 50 ? "#f87171" : "#D1D5DB" }}>{col.nullPct}%</span>
                                                    <span style={{ fontSize: "10px", color: "#4B5563" }}>({col.nullCount} nulls)</span>
                                                </div>
                                            </td>
                                            <td style={{ padding: "10px 14px", color: "#9CA3AF", fontFamily: "monospace" }}>{col.distinctCount.toLocaleString()}</td>
                                            <td style={{ padding: "10px 14px" }}>
                                                {col.anomalies.length > 0
                                                    ? <div style={{ display: "flex", flexWrap: "wrap", gap: "4px" }}>
                                                        {col.anomalies.map((a, i) => <span key={i} style={{ fontSize: "9px", fontWeight: 700, padding: "2px 7px", borderRadius: "4px", background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.2)", color: "#f87171" }}>{a}</span>)}
                                                    </div>
                                                    : <span style={{ fontSize: "10px", fontWeight: 700, padding: "2px 8px", borderRadius: "4px", background: "rgba(16,185,129,0.1)", border: "1px solid rgba(16,185,129,0.2)", color: "#34d399" }}>✓ Clean</span>
                                                }
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    {/* Numeric / Date ranges */}
                    {profile.columns.some(c => c.min != null || c.min_date != null) && (
                        <div style={{ ...card, padding: "20px 22px" }}>
                            <p style={{ ...S.label, margin: "0 0 14px", paddingBottom: "10px", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>Numeric & Date Ranges</p>
                            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(260px,1fr))", gap: "12px" }}>
                                {profile.columns.map(col => {
                                    if (col.min != null) return (
                                        <div key={col.name} style={{ background: "#080a12", border: "1px solid rgba(255,255,255,0.07)", borderRadius: "10px", padding: "14px 16px" }}>
                                            <p style={{ fontSize: "12px", fontWeight: 700, color: "#fff", fontFamily: "monospace", margin: "0 0 10px" }}>{col.name} <span style={{ color: "#22d3ee", fontWeight: 400 }}>({col.type})</span></p>
                                            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "8px", textAlign: "center" }}>
                                                {[["MIN", col.min?.toLocaleString() ?? "—", "#9CA3AF"], ["AVG", col.avg?.toFixed(2) ?? "—", "#818cf8"], ["MAX", col.max?.toLocaleString() ?? "—", "#9CA3AF"]].map(([l, v, c]) => (
                                                    <div key={l as string} style={{ background: "rgba(255,255,255,0.03)", borderRadius: "6px", padding: "8px 4px" }}>
                                                        <p style={{ fontSize: "9px", color: "#4B5563", margin: "0 0 4px", textTransform: "uppercase", letterSpacing: "0.06em" }}>{l as string}</p>
                                                        <p style={{ fontSize: "13px", fontWeight: 700, color: c as string, fontFamily: "monospace", margin: 0 }}>{v as string}</p>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    );
                                    if (col.min_date) return (
                                        <div key={col.name} style={{ background: "#080a12", border: "1px solid rgba(255,255,255,0.07)", borderRadius: "10px", padding: "14px 16px" }}>
                                            <p style={{ fontSize: "12px", fontWeight: 700, color: "#fff", fontFamily: "monospace", margin: "0 0 10px" }}>{col.name}</p>
                                            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px" }}>
                                                {[["Earliest", col.min_date], ["Latest", col.max_date]].map(([l, v]) => (
                                                    <div key={l as string} style={{ background: "rgba(255,255,255,0.03)", borderRadius: "6px", padding: "8px" }}>
                                                        <p style={{ fontSize: "9px", color: "#4B5563", margin: "0 0 4px", textTransform: "uppercase" }}>{l as string}</p>
                                                        <p style={{ fontSize: "11px", color: "#D1D5DB", fontFamily: "monospace", margin: 0 }}>{v ? new Date(v as string).toLocaleDateString() : "—"}</p>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    );
                                    return null;
                                })}
                            </div>
                        </div>
                    )}

                    {/* Top string values */}
                    {profile.columns.some(c => c.topValues?.length) && (
                        <div style={{ ...card, padding: "20px 22px" }}>
                            <p style={{ ...S.label, margin: "0 0 14px", paddingBottom: "10px", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>Top Value Distributions</p>
                            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(280px,1fr))", gap: "12px" }}>
                                {profile.columns.filter(c => c.topValues?.length).map(col => (
                                    <div key={col.name} style={{ background: "#080a12", border: "1px solid rgba(255,255,255,0.07)", borderRadius: "10px", padding: "14px 16px" }}>
                                        <p style={{ fontSize: "12px", fontWeight: 700, color: "#fff", fontFamily: "monospace", margin: "0 0 10px" }}>{col.name}</p>
                                        <div style={{ display: "flex", flexDirection: "column", gap: "7px" }}>
                                            {col.topValues!.map((v, i) => {
                                                const pct = profile.totalRows > 0 ? Math.round((v.count / profile.totalRows) * 100) : 0;
                                                return (
                                                    <div key={i} style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                                                        <span style={{ fontSize: "11px", color: "#9CA3AF", fontFamily: "monospace", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", flex: "0 0 120px" }}>{v.value || "[empty]"}</span>
                                                        <div style={{ flex: 1, height: "6px", background: "rgba(255,255,255,0.05)", borderRadius: "3px", overflow: "hidden" }}>
                                                            <div style={{ height: "100%", width: `${pct}%`, background: "linear-gradient(90deg,#6366f1,#8b5cf6)", borderRadius: "3px" }} />
                                                        </div>
                                                        <span style={{ fontSize: "10px", color: "#4B5563", whiteSpace: "nowrap", flexShrink: 0 }}>{v.count} ({pct}%)</span>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            )}

            <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
        </div>
    );
}
