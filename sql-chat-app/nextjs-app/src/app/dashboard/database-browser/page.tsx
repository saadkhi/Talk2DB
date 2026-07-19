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
