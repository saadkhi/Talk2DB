"use client";
import React, { useState } from "react";

interface DataTableProps {
    columns: string[];
    rows: any[];
    pageSize?: number;
}

function exportCSV(columns: string[], rows: any[], filename = "data.csv") {
    const escape = (v: any) => {
        const s = v == null ? "" : String(v);
        return s.includes(",") || s.includes('"') || s.includes("\n")
            ? `"${s.replace(/"/g, '""')}"`
            : s;
    };
    const csv = [
        columns.map(escape).join(","),
        ...rows.map(r => columns.map(c => escape(r[c])).join(",")),
    ].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = filename; a.click();
    URL.revokeObjectURL(url);
}

function exportJSON(rows: any[], filename = "data.json") {
    const blob = new Blob([JSON.stringify(rows, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = filename; a.click();
    URL.revokeObjectURL(url);
}

export default function DataTable({ columns, rows, pageSize = 25 }: DataTableProps) {
    const [page, setPage] = useState(0);
    const [sortCol, setSortCol] = useState<string | null>(null);
    const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");

    if (!columns?.length) {
        return (
            <p style={{ textAlign: "center", color: "#6B7280", padding: "32px 0", fontSize: "13px" }}>
                No columns to display
            </p>
        );
    }

    const sorted = sortCol
        ? [...rows].sort((a, b) => {
            const av = a[sortCol], bv = b[sortCol];
            if (av == null) return 1;
            if (bv == null) return -1;
            const an = Number(av), bn = Number(bv);
            if (!isNaN(an) && !isNaN(bn)) return sortDir === "asc" ? an - bn : bn - an;
            const as = String(av).toLowerCase(), bs = String(bv).toLowerCase();
            return sortDir === "asc" ? (as > bs ? 1 : -1) : (as < bs ? 1 : -1);
        })
        : rows;

    const totalPages = Math.max(1, Math.ceil(rows.length / pageSize));
    const safePage = Math.min(page, totalPages - 1);
    const paged = sorted.slice(safePage * pageSize, (safePage + 1) * pageSize);

    const btnBase: React.CSSProperties = {
        display: "flex", alignItems: "center", gap: "6px",
        padding: "6px 14px", borderRadius: "8px",
        fontSize: "11px", fontWeight: 700, cursor: "pointer",
        transition: "all 0.15s", border: "1px solid",
    };

    return (
        <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
            {/* Toolbar */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "8px" }}>
                <span style={{ fontSize: "12px", color: "#6B7280", fontWeight: 500 }}>
                    {rows.length.toLocaleString()} row{rows.length !== 1 ? "s" : ""}
                    {sortCol && <span style={{ color: "#6366f1" }}> · sorted by {sortCol} {sortDir === "asc" ? "↑" : "↓"}</span>}
                </span>
                <div style={{ display: "flex", gap: "8px" }}>
                    <button
                        onClick={() => exportCSV(columns, rows)}
                        style={{ ...btnBase, background: "rgba(16,185,129,0.08)", borderColor: "rgba(16,185,129,0.2)", color: "#34d399" }}
                        onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = "rgba(16,185,129,0.15)"}
                        onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = "rgba(16,185,129,0.08)"}
                        title="Download as CSV"
                    >
                        <svg width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
                        </svg>
                        CSV
                    </button>
                    <button
                        onClick={() => exportJSON(rows)}
                        style={{ ...btnBase, background: "rgba(99,102,241,0.08)", borderColor: "rgba(99,102,241,0.2)", color: "#818cf8" }}
                        onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = "rgba(99,102,241,0.15)"}
                        onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = "rgba(99,102,241,0.08)"}
                        title="Download as JSON"
                    >
                        <svg width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
                        </svg>
                        JSON
                    </button>
                    {sortCol && (
                        <button
                            onClick={() => { setSortCol(null); setSortDir("asc"); }}
                            style={{ ...btnBase, background: "rgba(255,255,255,0.03)", borderColor: "rgba(255,255,255,0.08)", color: "#6B7280" }}
                            title="Clear sort"
                        >
                            <svg width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                            </svg>
                            Clear sort
                        </button>
                    )}
                </div>
            </div>

            {/* Table */}
            <div style={{ overflowX: "auto", borderRadius: "10px", border: "1px solid rgba(255,255,255,0.08)" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "12px" }}>
                    <thead>
                        <tr style={{ background: "rgba(255,255,255,0.03)" }}>
                            {columns.map(col => (
                                <th
                                    key={col}
                                    onClick={() => {
                                        if (sortCol === col) setSortDir(d => d === "asc" ? "desc" : "asc");
                                        else { setSortCol(col); setSortDir("asc"); }
                                        setPage(0);
                                    }}
                                    style={{
                                        padding: "10px 14px", textAlign: "left",
                                        color: sortCol === col ? "#818cf8" : "#9CA3AF",
                                        fontWeight: 700, fontSize: "11px",
                                        textTransform: "uppercase", letterSpacing: "0.06em",
                                        cursor: "pointer", whiteSpace: "nowrap",
                                        userSelect: "none", transition: "color 0.15s",
                                        borderBottom: "1px solid rgba(255,255,255,0.08)",
                                    }}
                                    onMouseEnter={e => (e.currentTarget as HTMLElement).style.color = "#fff"}
                                    onMouseLeave={e => (e.currentTarget as HTMLElement).style.color = sortCol === col ? "#818cf8" : "#9CA3AF"}
                                >
                                    {col}
                                    {sortCol === col && (
                                        <span style={{ marginLeft: "4px", color: "#6366f1" }}>
                                            {sortDir === "asc" ? "↑" : "↓"}
                                        </span>
                                    )}
                                </th>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        {paged.length === 0 ? (
                            <tr>
                                <td colSpan={columns.length} style={{ textAlign: "center", color: "#4B5563", padding: "32px", fontSize: "13px" }}>
                                    No records found
                                </td>
                            </tr>
                        ) : (
                            paged.map((row, i) => (
                                <tr
                                    key={i}
                                    style={{ borderTop: "1px solid rgba(255,255,255,0.05)", transition: "background 0.1s" }}
                                    onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = "rgba(255,255,255,0.02)"}
                                    onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = "transparent"}
                                >
                                    {columns.map(col => {
                                        const val = row[col];
                                        return (
                                            <td
                                                key={col}
                                                title={val != null ? String(val) : "null"}
                                                style={{
                                                    padding: "9px 14px",
                                                    color: val == null ? "#374151" : "#D1D5DB",
                                                    fontFamily: val == null ? "inherit" : "'Geist Mono', monospace",
                                                    fontSize: "11px",
                                                    maxWidth: "260px",
                                                    overflow: "hidden",
                                                    textOverflow: "ellipsis",
                                                    whiteSpace: "nowrap",
                                                    fontStyle: val == null ? "italic" : "normal",
                                                }}
                                            >
                                                {val == null ? "null" : String(val)}
                                            </td>
                                        );
                                    })}
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
                <div style={{ display: "flex", justifyContent: "center", alignItems: "center", gap: "12px" }}>
                    <button
                        onClick={() => setPage(0)}
                        disabled={safePage === 0}
                        style={{ ...btnBase, background: "rgba(255,255,255,0.03)", borderColor: "rgba(255,255,255,0.08)", color: "#9CA3AF", opacity: safePage === 0 ? 0.4 : 1, cursor: safePage === 0 ? "not-allowed" : "pointer" }}
                    >«</button>
                    <button
                        onClick={() => setPage(p => Math.max(0, p - 1))}
                        disabled={safePage === 0}
                        style={{ ...btnBase, background: "rgba(255,255,255,0.03)", borderColor: "rgba(255,255,255,0.08)", color: "#9CA3AF", opacity: safePage === 0 ? 0.4 : 1, cursor: safePage === 0 ? "not-allowed" : "pointer" }}
                    >← Prev</button>
                    <span style={{ fontSize: "12px", color: "#6B7280", fontWeight: 600, minWidth: "80px", textAlign: "center" }}>
                        {safePage + 1} / {totalPages}
                    </span>
                    <button
                        onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))}
                        disabled={safePage === totalPages - 1}
                        style={{ ...btnBase, background: "rgba(255,255,255,0.03)", borderColor: "rgba(255,255,255,0.08)", color: "#9CA3AF", opacity: safePage === totalPages - 1 ? 0.4 : 1, cursor: safePage === totalPages - 1 ? "not-allowed" : "pointer" }}
                    >Next →</button>
                    <button
                        onClick={() => setPage(totalPages - 1)}
                        disabled={safePage === totalPages - 1}
                        style={{ ...btnBase, background: "rgba(255,255,255,0.03)", borderColor: "rgba(255,255,255,0.08)", color: "#9CA3AF", opacity: safePage === totalPages - 1 ? 0.4 : 1, cursor: safePage === totalPages - 1 ? "not-allowed" : "pointer" }}
                    >»</button>
                </div>
            )}
        </div>
    );
}
