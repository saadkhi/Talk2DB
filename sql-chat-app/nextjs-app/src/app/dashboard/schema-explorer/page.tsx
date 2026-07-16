"use client";
import React, { useState, useEffect } from "react";

interface ColumnInfo { name: string; type: string; nullable: boolean; isPrimary: boolean; }
interface TableInfo { name: string; rowCount: number; columns: ColumnInfo[]; }

const card = { background: "#0d0f1a", border: "1px solid rgba(255,255,255,0.08)", borderRadius: "14px" };

export default function SchemaExplorerPage() {
    const [tables, setTables] = useState<TableInfo[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [selected, setSelected] = useState<TableInfo | null>(null);
    const [search, setSearch] = useState("");

    useEffect(() => {
        fetch("/api/schema").then(r => r.json()).then(data => {
            if (data.error) throw new Error(data.error);
            setTables(data.tables || []);
            if (data.tables?.length) setSelected(data.tables[0]);
        }).catch(e => setError(e.message)).finally(() => setLoading(false));
    }, []);

    const filtered = tables.filter(t => t.name.toLowerCase().includes(search.toLowerCase()));

    if (loading) return (
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", padding: "80px 0", gap: "12px", color: "#6B7280", fontSize: "13px" }}>
            <div style={{ width: "20px", height: "20px", border: "2px solid rgba(99,102,241,0.2)", borderTop: "2px solid #6366f1", borderRadius: "50%", animation: "spin 0.7s linear infinite" }} />
            Introspecting schema…
            <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
        </div>
    );

    if (error) return (
        <div style={{ background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.2)", borderRadius: "12px", padding: "16px 20px" }}>
            <p style={{ fontSize: "13px", fontWeight: 700, color: "#f87171", margin: "0 0 4px" }}>⚠ Schema Error</p>
            <p style={{ fontSize: "12px", color: "#fca5a5", margin: 0 }}>{error}</p>
        </div>
    );

    return (
        <div style={{ display: "flex", flexDirection: "column", gap: "24px", maxWidth: "1200px", margin: "0 auto", width: "100%" }}>
            <div>
                <h1 style={{ fontSize: "22px", fontWeight: 800, color: "#fff", margin: "0 0 4px", letterSpacing: "-0.03em" }}>Schema Explorer</h1>
                <p style={{ fontSize: "13px", color: "#6B7280", margin: 0 }}>Browse tables, columns, constraints and row counts from your connected database.</p>
            </div>

            {tables.length === 0 ? (
                <div style={{ ...card, padding: "48px 24px", textAlign: "center" }}>
                    <p style={{ fontSize: "15px", fontWeight: 700, color: "#fff", margin: "0 0 6px" }}>No tables found</p>
                    <p style={{ fontSize: "12px", color: "#6B7280", margin: 0 }}>Connect a database and make sure it has tables in the public schema.</p>
                </div>
            ) : (
                <div style={{ display: "grid", gridTemplateColumns: "260px 1fr", gap: "16px", alignItems: "start" }}>
                    {/* Sidebar */}
                    <div style={{ ...card, padding: "16px", display: "flex", flexDirection: "column", gap: "10px", position: "sticky", top: "80px" }}>
                        <div style={{ fontSize: "11px", fontWeight: 700, color: "#6B7280", textTransform: "uppercase", letterSpacing: "0.08em", paddingBottom: "8px", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
                            Tables ({tables.length})
                        </div>
                        <input value={search} onChange={e => setSearch(e.target.value)}
                            placeholder="Filter tables…"
                            style={{ background: "#080a12", border: "1px solid rgba(255,255,255,0.08)", borderRadius: "8px", padding: "7px 12px", fontSize: "12px", color: "#fff", outline: "none", width: "100%", boxSizing: "border-box" }}
                        />
                        <div style={{ display: "flex", flexDirection: "column", gap: "3px", maxHeight: "520px", overflowY: "auto" }}>
                            {filtered.map(t => {
                                const active = selected?.name === t.name;
                                return (
                                    <button key={t.name} onClick={() => setSelected(t)} style={{
                                        display: "flex", alignItems: "center", justifyContent: "space-between",
                                        padding: "9px 12px", borderRadius: "8px", border: "none",
                                        background: active ? "rgba(99,102,241,0.15)" : "transparent",
                                        cursor: "pointer", textAlign: "left", transition: "background 0.15s",
                                        outline: active ? "1px solid rgba(99,102,241,0.3)" : "none",
                                    }}
                                        onMouseEnter={e => { if (!active) (e.currentTarget as HTMLElement).style.background = "rgba(255,255,255,0.04)"; }}
                                        onMouseLeave={e => { if (!active) (e.currentTarget as HTMLElement).style.background = "transparent"; }}
                                    >
                                        <div style={{ display: "flex", alignItems: "center", gap: "8px", minWidth: 0 }}>
                                            <svg width="13" height="13" fill="none" stroke={active ? "#818cf8" : "#6B7280"} strokeWidth="2" viewBox="0 0 24 24" style={{ flexShrink: 0 }}>
                                                <path strokeLinecap="round" strokeLinejoin="round" d="M20.25 6.375c0 2.278-3.694 4.125-8.25 4.125S3.75 8.653 3.75 6.375m16.5 0c0-2.278-3.694-4.125-8.25-4.125S3.75 4.097 3.75 6.375m16.5 0v11.25c0 2.278-3.694 4.125-8.25 4.125s-8.25-1.847-8.25-4.125V6.375m16.5 2.625c0 2.278-3.694 4.125-8.25 4.125s-8.25-1.847-8.25-4.125" />
                                            </svg>
                                            <span style={{ fontSize: "12px", fontWeight: 600, color: active ? "#fff" : "#9CA3AF", fontFamily: "monospace", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{t.name}</span>
                                        </div>
                                        <span style={{ fontSize: "10px", color: "#4B5563", fontWeight: 600, whiteSpace: "nowrap", flexShrink: 0 }}>{t.rowCount.toLocaleString()} rows</span>
                                    </button>
                                );
                            })}
                        </div>
                    </div>

                    {/* Detail panel */}
                    {selected ? (
                        <div style={{ ...card, padding: "22px 24px", display: "flex", flexDirection: "column", gap: "16px" }}>
                            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", paddingBottom: "14px", borderBottom: "1px solid rgba(255,255,255,0.06)", flexWrap: "wrap", gap: "10px" }}>
                                <div>
                                    <h2 style={{ fontSize: "18px", fontWeight: 800, color: "#fff", margin: "0 0 4px", fontFamily: "monospace" }}>{selected.name}</h2>
                                    <span style={{ fontSize: "11px", color: "#6366f1", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em" }}>Table Definition</span>
                                </div>
                                <div style={{ display: "flex", gap: "10px" }}>
                                    <div style={{ background: "rgba(99,102,241,0.08)", border: "1px solid rgba(99,102,241,0.15)", borderRadius: "8px", padding: "8px 14px", textAlign: "center" }}>
                                        <p style={{ fontSize: "10px", color: "#6B7280", margin: "0 0 2px", textTransform: "uppercase", letterSpacing: "0.06em" }}>Columns</p>
                                        <p style={{ fontSize: "18px", fontWeight: 800, color: "#818cf8", margin: 0 }}>{selected.columns.length}</p>
                                    </div>
                                    <div style={{ background: "rgba(16,185,129,0.08)", border: "1px solid rgba(16,185,129,0.15)", borderRadius: "8px", padding: "8px 14px", textAlign: "center" }}>
                                        <p style={{ fontSize: "10px", color: "#6B7280", margin: "0 0 2px", textTransform: "uppercase", letterSpacing: "0.06em" }}>Rows</p>
                                        <p style={{ fontSize: "18px", fontWeight: 800, color: "#34d399", margin: 0 }}>{selected.rowCount.toLocaleString()}</p>
                                    </div>
                                </div>
                            </div>

                            <div style={{ overflowX: "auto", borderRadius: "10px", border: "1px solid rgba(255,255,255,0.07)" }}>
                                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "12px" }}>
                                    <thead>
                                        <tr style={{ background: "rgba(255,255,255,0.03)" }}>
                                            {["Column", "Data Type", "Nullable", "Constraint"].map(h => (
                                                <th key={h} style={{ padding: "10px 16px", textAlign: "left", fontSize: "10px", fontWeight: 700, color: "#6B7280", textTransform: "uppercase", letterSpacing: "0.07em", whiteSpace: "nowrap" }}>{h}</th>
                                            ))}
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {selected.columns.map(col => (
                                            <tr key={col.name} style={{ borderTop: "1px solid rgba(255,255,255,0.05)", transition: "background 0.1s" }}
                                                onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = "rgba(255,255,255,0.02)"}
                                                onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = "transparent"}
                                            >
                                                <td style={{ padding: "11px 16px", fontFamily: "monospace", fontWeight: 700, color: "#fff", fontSize: "12px" }}>
                                                    {col.isPrimary && <span style={{ marginRight: "6px" }}>🔑</span>}{col.name}
                                                </td>
                                                <td style={{ padding: "11px 16px", fontFamily: "monospace", color: "#22d3ee", fontSize: "12px" }}>{col.type}</td>
                                                <td style={{ padding: "11px 16px" }}>
                                                    {col.nullable
                                                        ? <span style={{ fontSize: "10px", color: "#6B7280" }}>NULL</span>
                                                        : <span style={{ fontSize: "10px", fontWeight: 700, color: "#f87171", background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.2)", borderRadius: "4px", padding: "2px 7px" }}>NOT NULL</span>
                                                    }
                                                </td>
                                                <td style={{ padding: "11px 16px" }}>
                                                    {col.isPrimary
                                                        ? <span style={{ fontSize: "10px", fontWeight: 700, color: "#f59e0b", background: "rgba(245,158,11,0.1)", border: "1px solid rgba(245,158,11,0.2)", borderRadius: "4px", padding: "2px 8px" }}>PRIMARY KEY</span>
                                                        : <span style={{ fontSize: "12px", color: "#374151" }}>—</span>
                                                    }
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>

                            <div style={{ background: "rgba(99,102,241,0.06)", border: "1px solid rgba(99,102,241,0.12)", borderRadius: "10px", padding: "12px 16px", display: "flex", alignItems: "center", gap: "8px" }}>
                                <svg width="14" height="14" fill="none" stroke="#818cf8" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M12 18v-5.25m0 0a6.01 6.01 0 001.5-.189m-1.5.189a6.01 6.01 0 01-1.5-.189m3.75 7.478a12.06 12.06 0 01-4.5 0m3.75 2.383a14.406 14.406 0 01-3 0M14.25 18v-.192c0-.983.658-1.823 1.508-2.316a7.5 7.5 0 10-7.517 0c.85.493 1.509 1.333 1.509 2.316V18" /></svg>
                                <span style={{ fontSize: "12px", color: "#818cf8" }}>Tip: Use the <strong>Data Profiler</strong> to analyze null rates, cardinality and value distributions for this table.</span>
                            </div>
                        </div>
                    ) : (
                        <div style={{ ...card, padding: "48px 24px", textAlign: "center", color: "#6B7280", fontSize: "13px" }}>
                            Select a table from the sidebar to inspect its definition.
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
