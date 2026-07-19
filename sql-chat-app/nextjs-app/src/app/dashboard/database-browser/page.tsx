"use client";
import React, { useState, useEffect, useCallback } from "react";

/* ── Types ─────────────────────────────────────────────────── */
interface ColInfo { name: string; type: string; nullable: boolean; isPrimary: boolean; }
interface TableInfo { name: string; rowCount: number; columns: ColInfo[]; }

interface TableData {
    table: string; totalRows: number; page: number; limit: number;
    totalPages: number; columns: string[]; rows: any[];
}

/* ── Shared styles ─────────────────────────────────────────── */
const card: React.CSSProperties = {
    background: "#0d0f1a", border: "1px solid rgba(255,255,255,0.08)", borderRadius: "12px",
};
const label: React.CSSProperties = {
    fontSize: "10px", fontWeight: 700, color: "#6B7280",
    textTransform: "uppercase", letterSpacing: "0.08em",
};
const spin = `@keyframes spin { to { transform: rotate(360deg); } }`;

function Spinner({ size = 18 }: { size?: number }) {
    return (
        <>
            <div style={{
                width: size, height: size, flexShrink: 0,
                border: `2px solid rgba(99,102,241,0.15)`,
                borderTop: "2px solid #6366f1",
                borderRadius: "50%", animation: "spin 0.7s linear infinite",
            }} />
            <style>{spin}</style>
        </>
    );
}

/* ── Export helpers ────────────────────────────────────────── */
function exportCSV(columns: string[], rows: any[], name: string) {
    const esc = (v: any) => { const s = v == null ? "" : String(v); return s.includes(",") || s.includes('"') || s.includes("\n") ? `"${s.replace(/"/g, '""')}"` : s; };
    const csv = [columns.map(esc).join(","), ...rows.map(r => columns.map(c => esc(r[c])).join(","))].join("\n");
    const a = document.createElement("a"); a.href = URL.createObjectURL(new Blob([csv], { type: "text/csv" })); a.download = `${name}.csv`; a.click();
}
function exportJSON(rows: any[], name: string) {
    const a = document.createElement("a"); a.href = URL.createObjectURL(new Blob([JSON.stringify(rows, null, 2)], { type: "application/json" })); a.download = `${name}.json`; a.click();
}

/* ── Main page ─────────────────────────────────────────────── */
export default function DatabaseBrowserPage() {
    const [tables, setTables] = useState<TableInfo[]>([]);
    const [loadingSchema, setLoadingSchema] = useState(true);
    const [schemaErr, setSchemaErr] = useState<string | null>(null);
    const [search, setSearch] = useState("");

    const [selectedTable, setSelectedTable] = useState<TableInfo | null>(null);
    const [tableData, setTableData] = useState<TableData | null>(null);
    const [loadingData, setLoadingData] = useState(false);
    const [dataErr, setDataErr] = useState<string | null>(null);
    const [page, setPage] = useState(0);
    const [pageSize, setPageSize] = useState(50);
    const [activeTab, setActiveTab] = useState<"data" | "structure">("data");

    /* Load schema on mount */
    useEffect(() => {
        fetch("/api/schema").then(r => r.json()).then(d => {
            if (d.error) throw new Error(d.error);
            setTables(d.tables || []);
            if (d.tables?.length) selectTable(d.tables[0], 0, 50);
        }).catch(e => setSchemaErr(e.message)).finally(() => setLoadingSchema(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const selectTable = useCallback(async (t: TableInfo, pg: number, limit: number) => {
        setSelectedTable(t); setPage(pg); setDataErr(null); setActiveTab("data"); setLoadingData(true);
        try {
            const r = await fetch(`/api/database/table-data?table=${encodeURIComponent(t.name)}&page=${pg}&limit=${limit}`);
            const d = await r.json();
            if (!r.ok) throw new Error(d.error || "Failed to load table data");
            setTableData(d);
        } catch (e: any) { setDataErr(e.message); setTableData(null); }
        finally { setLoadingData(false); }
    }, []);

    const loadPage = (pg: number) => { if (selectedTable) selectTable(selectedTable, pg, pageSize); };
    const changePageSize = (sz: number) => { setPageSize(sz); if (selectedTable) selectTable(selectedTable, 0, sz); };

    const filtered = tables.filter(t => t.name.toLowerCase().includes(search.toLowerCase()));
    const dbName = typeof window !== "undefined" ? new URL(window.location.href).hostname : "database";

    return (
        <div style={{ display: "flex", flexDirection: "column", gap: "20px", maxWidth: "1400px", margin: "0 auto", width: "100%" }}>
            {/* Header */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "12px" }}>
                <div>
                    <h1 style={{ fontSize: "22px", fontWeight: 800, color: "#fff", margin: "0 0 4px", letterSpacing: "-0.03em" }}>Database Browser</h1>
                    <p style={{ fontSize: "13px", color: "#6B7280", margin: 0 }}>
                        Browse all tables, inspect structure, and view live row data from your connected database.
                    </p>
                </div>
                {!loadingSchema && tables.length > 0 && (
                    <div style={{ display: "flex", alignItems: "center", gap: "8px", ...card, padding: "8px 14px" }}>
                        <div style={{ width: "8px", height: "8px", borderRadius: "50%", background: "#10b981", boxShadow: "0 0 6px #10b981" }} />
                        <span style={{ fontSize: "12px", color: "#9CA3AF" }}>
                            <span style={{ color: "#fff", fontWeight: 600 }}>{tables.length}</span> tables
                        </span>
                        <span style={{ width: "1px", height: "14px", background: "rgba(255,255,255,0.08)" }} />
                        <span style={{ fontSize: "12px", color: "#9CA3AF" }}>
                            <span style={{ color: "#fff", fontWeight: 600 }}>{tables.reduce((s, t) => s + t.rowCount, 0).toLocaleString()}</span> total rows
                        </span>
                    </div>
                )}
            </div>

            {/* Loading / error */}
            {loadingSchema && <div style={{ display: "flex", alignItems: "center", gap: "10px", padding: "60px 0", justifyContent: "center", color: "#6B7280", fontSize: "13px" }}><Spinner />Loading database schema…</div>}
            {schemaErr && <div style={{ ...card, padding: "16px 20px", background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.2)" }}><p style={{ fontSize: "13px", color: "#f87171", margin: 0 }}>⚠ {schemaErr}</p></div>}

            {!loadingSchema && !schemaErr && tables.length === 0 && (
                <div style={{ ...card, padding: "48px 24px", textAlign: "center" }}>
                    <p style={{ fontSize: "15px", fontWeight: 700, color: "#fff", margin: "0 0 6px" }}>No tables found</p>
                    <p style={{ fontSize: "12px", color: "#6B7280", margin: 0 }}>Connect a PostgreSQL database to browse its tables.</p>
                </div>
            )}

            {/* ── Main browser layout ── */}
            {!loadingSchema && !schemaErr && tables.length > 0 && (
                <div style={{ display: "grid", gridTemplateColumns: "260px 1fr", gap: "14px", alignItems: "start" }}>

                    {/* ── Left sidebar: table list ── */}
                    <div style={{ ...card, padding: "14px", display: "flex", flexDirection: "column", gap: "10px", position: "sticky", top: "72px", maxHeight: "calc(100vh - 140px)", overflow: "hidden" }}>
                        <div style={{ ...label }}>Tables ({tables.length})</div>
                        <input
                            value={search} onChange={e => setSearch(e.target.value)}
                            placeholder="Search tables…"
                            style={{ background: "#080a12", border: "1px solid rgba(255,255,255,0.08)", borderRadius: "8px", padding: "7px 12px", fontSize: "12px", color: "#fff", outline: "none", width: "100%", boxSizing: "border-box" }}
                        />
                        <div style={{ overflowY: "auto", display: "flex", flexDirection: "column", gap: "2px" }}>
                            {filtered.map(t => {
                                const active = selectedTable?.name === t.name;
                                return (
                                    <button key={t.name} onClick={() => selectTable(t, 0, pageSize)}
                                        style={{
                                            display: "flex", alignItems: "center", justifyContent: "space-between",
                                            padding: "8px 10px", borderRadius: "8px", border: "none",
                                            background: active ? "rgba(99,102,241,0.15)" : "transparent",
                                            outline: active ? "1px solid rgba(99,102,241,0.3)" : "none",
                                            cursor: "pointer", transition: "background 0.12s", textAlign: "left", width: "100%",
                                        }}
                                        onMouseEnter={e => { if (!active) (e.currentTarget as HTMLElement).style.background = "rgba(255,255,255,0.04)"; }}
                                        onMouseLeave={e => { if (!active) (e.currentTarget as HTMLElement).style.background = "transparent"; }}
                                    >
                                        <div style={{ display: "flex", alignItems: "center", gap: "7px", minWidth: 0 }}>
                                            <svg width="12" height="12" fill="none" stroke={active ? "#818cf8" : "#4B5563"} strokeWidth="2" viewBox="0 0 24 24" style={{ flexShrink: 0 }}>
                                                <path strokeLinecap="round" strokeLinejoin="round" d="M20.25 6.375c0 2.278-3.694 4.125-8.25 4.125S3.75 8.653 3.75 6.375m16.5 0c0-2.278-3.694-4.125-8.25-4.125S3.75 4.097 3.75 6.375m16.5 0v11.25c0 2.278-3.694 4.125-8.25 4.125s-8.25-1.847-8.25-4.125V6.375m16.5 2.625c0 2.278-3.694 4.125-8.25 4.125s-8.25-1.847-8.25-4.125" />
                                            </svg>
                                            <span style={{ fontSize: "12px", fontWeight: active ? 700 : 500, color: active ? "#fff" : "#9CA3AF", fontFamily: "monospace", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{t.name}</span>
                                        </div>
                                        <span style={{ fontSize: "10px", color: "#374151", whiteSpace: "nowrap", flexShrink: 0, marginLeft: "6px" }}>{t.rowCount.toLocaleString()}</span>
                                    </button>
                                );
                            })}
                        </div>
                    </div>

                    {/* ── Right panel: data + structure ── */}
                    <div style={{ display: "flex", flexDirection: "column", gap: "0", minWidth: 0 }}>
                        {selectedTable && (
                            <>
                                {/* Table header */}
                                <div style={{ ...card, padding: "14px 20px", borderBottomLeftRadius: 0, borderBottomRightRadius: 0, borderBottom: "1px solid rgba(255,255,255,0.06)", display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "10px" }}>
                                    <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                                        <h2 style={{ fontSize: "15px", fontWeight: 800, color: "#fff", margin: 0, fontFamily: "monospace" }}>{selectedTable.name}</h2>
                                        <span style={{ fontSize: "10px", color: "#34d399", background: "rgba(16,185,129,0.08)", border: "1px solid rgba(16,185,129,0.15)", borderRadius: "20px", padding: "2px 9px", fontWeight: 700 }}>
                                            {selectedTable.rowCount.toLocaleString()} rows
                                        </span>
                                        <span style={{ fontSize: "10px", color: "#818cf8", background: "rgba(99,102,241,0.08)", border: "1px solid rgba(99,102,241,0.15)", borderRadius: "20px", padding: "2px 9px", fontWeight: 700 }}>
                                            {selectedTable.columns.length} cols
                                        </span>
                                    </div>
                                    {/* Tab switcher */}
                                    <div style={{ display: "flex", gap: "4px", background: "rgba(255,255,255,0.04)", borderRadius: "8px", padding: "3px" }}>
                                        {(["data", "structure"] as const).map(tab => (
                                            <button key={tab} onClick={() => setActiveTab(tab)} style={{
                                                padding: "5px 14px", borderRadius: "6px", fontSize: "12px", fontWeight: 600,
                                                background: activeTab === tab ? "rgba(99,102,241,0.2)" : "transparent",
                                                border: activeTab === tab ? "1px solid rgba(99,102,241,0.35)" : "1px solid transparent",
                                                color: activeTab === tab ? "#a5b4fc" : "#6B7280", cursor: "pointer", transition: "all 0.12s",
                                                textTransform: "capitalize",
                                            }}>{tab}</button>
                                        ))}
                                    </div>
                                </div>

                                {/* ── DATA TAB ── */}
                                {activeTab === "data" && (
                                    <div style={{ ...card, borderTopLeftRadius: 0, borderTopRightRadius: 0, padding: "0" }}>
                                        {/* Toolbar */}
                                        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 16px", borderBottom: "1px solid rgba(255,255,255,0.06)", flexWrap: "wrap", gap: "8px" }}>
                                            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                                                <span style={{ ...label }}>Rows per page:</span>
                                                {[25, 50, 100, 200].map(sz => (
                                                    <button key={sz} onClick={() => changePageSize(sz)} style={{
                                                        padding: "4px 10px", borderRadius: "6px", fontSize: "11px", fontWeight: 700,
                                                        background: pageSize === sz ? "rgba(99,102,241,0.15)" : "rgba(255,255,255,0.04)",
                                                        border: pageSize === sz ? "1px solid rgba(99,102,241,0.3)" : "1px solid rgba(255,255,255,0.07)",
                                                        color: pageSize === sz ? "#a5b4fc" : "#6B7280", cursor: "pointer",
                                                    }}>{sz}</button>
                                                ))}
                                            </div>
                                            {tableData && (
                                                <div style={{ display: "flex", gap: "8px" }}>
                                                    <button onClick={() => exportCSV(tableData.columns, tableData.rows, selectedTable.name)}
                                                        style={{ display: "flex", alignItems: "center", gap: "5px", padding: "5px 12px", borderRadius: "7px", fontSize: "11px", fontWeight: 700, background: "rgba(16,185,129,0.08)", border: "1px solid rgba(16,185,129,0.2)", color: "#34d399", cursor: "pointer" }}>
                                                        <svg width="11" height="11" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" /></svg>
                                                        CSV
                                                    </button>
                                                    <button onClick={() => exportJSON(tableData.rows, selectedTable.name)}
                                                        style={{ display: "flex", alignItems: "center", gap: "5px", padding: "5px 12px", borderRadius: "7px", fontSize: "11px", fontWeight: 700, background: "rgba(99,102,241,0.08)", border: "1px solid rgba(99,102,241,0.2)", color: "#818cf8", cursor: "pointer" }}>
                                                        <svg width="11" height="11" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" /></svg>
                                                        JSON
                                                    </button>
                                                </div>
                                            )}
                                        </div>

                                        {/* Loading state */}
                                        {loadingData && (
                                            <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "10px", padding: "48px", color: "#6B7280", fontSize: "13px" }}>
                                                <Spinner />Loading rows…
                                            </div>
                                        )}

                                        {/* Error state */}
                                        {!loadingData && dataErr && (
                                            <div style={{ padding: "16px 20px", background: "rgba(239,68,68,0.06)", borderTop: "1px solid rgba(239,68,68,0.15)" }}>
                                                <p style={{ fontSize: "12px", color: "#f87171", margin: 0 }}>⚠ {dataErr}</p>
                                            </div>
                                        )}

                                        {/* Data table */}
                                        {!loadingData && tableData && tableData.columns.length > 0 && (
                                            <div style={{ overflowX: "auto" }}>
                                                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "12px", minWidth: "600px" }}>
                                                    <thead>
                                                        <tr style={{ background: "rgba(255,255,255,0.03)", position: "sticky", top: 0 }}>
                                                            <th style={{ padding: "9px 14px", textAlign: "left", fontSize: "10px", fontWeight: 700, color: "#374151", textTransform: "uppercase", letterSpacing: "0.06em", borderBottom: "1px solid rgba(255,255,255,0.07)", width: "48px" }}>#</th>
                                                            {tableData.columns.map(col => (
                                                                <th key={col} style={{ padding: "9px 14px", textAlign: "left", fontSize: "10px", fontWeight: 700, color: "#9CA3AF", textTransform: "uppercase", letterSpacing: "0.06em", borderBottom: "1px solid rgba(255,255,255,0.07)", whiteSpace: "nowrap" }}>
                                                                    {col}
                                                                </th>
                                                            ))}
                                                        </tr>
                                                    </thead>
                                                    <tbody>
                                                        {tableData.rows.length === 0 ? (
                                                            <tr>
                                                                <td colSpan={tableData.columns.length + 1} style={{ padding: "32px", textAlign: "center", color: "#4B5563", fontSize: "13px" }}>
                                                                    No records in this table
                                                                </td>
                                                            </tr>
                                                        ) : tableData.rows.map((row, i) => (
                                                            <tr key={i} style={{ borderTop: "1px solid rgba(255,255,255,0.04)", transition: "background 0.1s" }}
                                                                onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = "rgba(255,255,255,0.02)"}
                                                                onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = "transparent"}
                                                            >
                                                                <td style={{ padding: "8px 14px", color: "#374151", fontSize: "10px", fontFamily: "monospace" }}>
                                                                    {tableData.page * tableData.limit + i + 1}
                                                                </td>
                                                                {tableData.columns.map(col => {
                                                                    const val = row[col];
                                                                    const isNull = val == null;
                                                                    const display = isNull ? "null" : String(val);
                                                                    return (
                                                                        <td key={col} title={display} style={{
                                                                            padding: "8px 14px", maxWidth: "240px",
                                                                            overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                                                                            color: isNull ? "#374151" : "#D1D5DB",
                                                                            fontStyle: isNull ? "italic" : "normal",
                                                                            fontFamily: isNull ? "inherit" : "monospace",
                                                                            fontSize: "11px",
                                                                        }}>
                                                                            {display}
                                                                        </td>
                                                                    );
                                                                })}
                                                            </tr>
                                                        ))}
                                                    </tbody>
                                                </table>
                                            </div>
                                        )}

                                        {/* Pagination */}
                                        {tableData && tableData.totalPages > 1 && (
                                            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 16px", borderTop: "1px solid rgba(255,255,255,0.06)", flexWrap: "wrap", gap: "8px" }}>
                                                <span style={{ fontSize: "11px", color: "#6B7280" }}>
                                                    Showing rows {tableData.page * tableData.limit + 1}–{Math.min((tableData.page + 1) * tableData.limit, tableData.totalRows).toLocaleString()} of {tableData.totalRows.toLocaleString()}
                                                </span>
                                                <div style={{ display: "flex", gap: "6px", alignItems: "center" }}>
                                                    <button onClick={() => loadPage(0)} disabled={tableData.page === 0}
                                                        style={{ padding: "5px 10px", borderRadius: "6px", fontSize: "11px", fontWeight: 700, background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", color: tableData.page === 0 ? "#374151" : "#9CA3AF", cursor: tableData.page === 0 ? "not-allowed" : "pointer" }}>«</button>
                                                    <button onClick={() => loadPage(tableData.page - 1)} disabled={tableData.page === 0}
                                                        style={{ padding: "5px 10px", borderRadius: "6px", fontSize: "11px", fontWeight: 700, background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", color: tableData.page === 0 ? "#374151" : "#9CA3AF", cursor: tableData.page === 0 ? "not-allowed" : "pointer" }}>‹ Prev</button>
                                                    <span style={{ fontSize: "11px", color: "#6B7280", padding: "0 8px" }}>
                                                        Page {tableData.page + 1} / {tableData.totalPages}
                                                    </span>
                                                    <button onClick={() => loadPage(tableData.page + 1)} disabled={tableData.page >= tableData.totalPages - 1}
                                                        style={{ padding: "5px 10px", borderRadius: "6px", fontSize: "11px", fontWeight: 700, background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", color: tableData.page >= tableData.totalPages - 1 ? "#374151" : "#9CA3AF", cursor: tableData.page >= tableData.totalPages - 1 ? "not-allowed" : "pointer" }}>Next ›</button>
                                                    <button onClick={() => loadPage(tableData.totalPages - 1)} disabled={tableData.page >= tableData.totalPages - 1}
                                                        style={{ padding: "5px 10px", borderRadius: "6px", fontSize: "11px", fontWeight: 700, background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", color: tableData.page >= tableData.totalPages - 1 ? "#374151" : "#9CA3AF", cursor: tableData.page >= tableData.totalPages - 1 ? "not-allowed" : "pointer" }}>»</button>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                )}

                                {/* ── STRUCTURE TAB ── */}
                                {activeTab === "structure" && (
                                    <div style={{ ...card, borderTopLeftRadius: 0, borderTopRightRadius: 0 }}>
                                        <div style={{ overflowX: "auto" }}>
                                            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "12px" }}>
                                                <thead>
                                                    <tr style={{ background: "rgba(255,255,255,0.03)" }}>
                                                        {["Column", "Data Type", "Nullable", "Constraint"].map(h => (
                                                            <th key={h} style={{ padding: "10px 16px", textAlign: "left", fontSize: "10px", fontWeight: 700, color: "#6B7280", textTransform: "uppercase", letterSpacing: "0.07em", borderBottom: "1px solid rgba(255,255,255,0.07)" }}>{h}</th>
                                                        ))}
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {selectedTable.columns.map(col => (
                                                        <tr key={col.name} style={{ borderTop: "1px solid rgba(255,255,255,0.04)", transition: "background 0.1s" }}
                                                            onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = "rgba(255,255,255,0.02)"}
                                                            onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = "transparent"}
                                                        >
                                                            <td style={{ padding: "11px 16px", fontFamily: "monospace", fontWeight: 700, color: "#fff" }}>
                                                                {col.isPrimary && <span style={{ marginRight: "6px" }}>🔑</span>}
                                                                {col.name}
                                                            </td>
                                                            <td style={{ padding: "11px 16px", fontFamily: "monospace", color: "#22d3ee" }}>{col.type}</td>
                                                            <td style={{ padding: "11px 16px" }}>
                                                                {col.nullable
                                                                    ? <span style={{ fontSize: "10px", color: "#6B7280" }}>NULL</span>
                                                                    : <span style={{ fontSize: "10px", fontWeight: 700, color: "#f87171", background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.2)", borderRadius: "4px", padding: "2px 7px" }}>NOT NULL</span>
                                                                }
                                                            </td>
                                                            <td style={{ padding: "11px 16px" }}>
                                                                {col.isPrimary
                                                                    ? <span style={{ fontSize: "10px", fontWeight: 700, color: "#f59e0b", background: "rgba(245,158,11,0.1)", border: "1px solid rgba(245,158,11,0.2)", borderRadius: "4px", padding: "2px 8px" }}>PRIMARY KEY</span>
                                                                    : <span style={{ color: "#374151" }}>—</span>
                                                                }
                                                            </td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>
                                    </div>
                                )}
                            </>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
