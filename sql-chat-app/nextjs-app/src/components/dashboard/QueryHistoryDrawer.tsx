"use client";
/**
 * QueryHistoryDrawer
 *
 * A slide-in panel (right side) that shows every SQL run from the current
 * session.  Each entry shows:
 *   - timestamp & exec time
 *   - NL prompt (if any)
 *   - SQL (monospace, scrollable)
 *   - row count / error message
 *   - "Re-run" button  → calls onRerun(entry.sql, entry.prompt)
 *   - delete button
 *
 * Export is also available per-entry (CSV / Excel).
 */

import React, { useState } from "react";
import { useQueryHistory, HistoryEntry } from "@/context/QueryHistoryContext";
import { exportCSV, exportExcel } from "@/lib/exportUtils";

interface Props {
    isOpen: boolean;
    onClose: () => void;
    /** Called when the user clicks Re-run on an entry */
    onRerun: (sql: string, prompt: string) => void;
}

function fmtTime(d: Date) {
    return d.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", second: "2-digit" });
}

function fmtMs(ms: number) {
    if (ms < 1000) return `${ms}ms`;
    return `${(ms / 1000).toFixed(2)}s`;
}

const card: React.CSSProperties = {
    background: "#0d0f1a",
    border: "1px solid rgba(255,255,255,0.07)",
    borderRadius: "12px",
    overflow: "hidden",
};

export default function QueryHistoryDrawer({ isOpen, onClose, onRerun }: Props) {
    const { entries, removeEntry, clearHistory } = useQueryHistory();
    const [expandedId, setExpandedId] = useState<number | null>(null);
    const [exportingId, setExportingId] = useState<number | null>(null);

    if (!isOpen) return null;

    const handleExcelExport = async (entry: HistoryEntry) => {
        if (entry.status !== "success" || entry.rows.length === 0) return;
        setExportingId(entry.id);
        const stem = entry.prompt
            ? entry.prompt.slice(0, 30).replace(/[^a-z0-9]/gi, "_")
            : `query_${entry.id}`;
        await exportExcel(entry.columns, entry.rows, `${stem}.xlsx`);
        setExportingId(null);
    };

    return (
        <>
            {/* Backdrop */}
            <div
                onClick={onClose}
                style={{
                    position: "fixed", inset: 0, zIndex: 200,
                    background: "rgba(0,0,0,0.55)",
                    backdropFilter: "blur(4px)",
                }}
            />

            {/* Drawer panel */}
            <div
                style={{
                    position: "fixed", top: 0, right: 0, bottom: 0, zIndex: 201,
                    width: "min(520px, 95vw)",
                    background: "#080a12",
                    borderLeft: "1px solid rgba(255,255,255,0.08)",
                    display: "flex", flexDirection: "column",
                    animation: "drawerIn 0.22s cubic-bezier(0.16,1,0.3,1) forwards",
                    boxShadow: "-20px 0 60px rgba(0,0,0,0.5)",
                }}
            >
                {/* Header */}
                <div style={{
                    display: "flex", alignItems: "center", justifyContent: "space-between",
                    padding: "18px 20px 14px",
                    borderBottom: "1px solid rgba(255,255,255,0.07)",
                    flexShrink: 0,
                }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                        <div style={{
                            width: "30px", height: "30px", borderRadius: "8px",
                            background: "rgba(99,102,241,0.12)",
                            display: "flex", alignItems: "center", justifyContent: "center",
                        }}>
                            <svg width="14" height="14" fill="none" stroke="#818cf8" strokeWidth="2" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                        </div>
                        <div>
                            <h2 style={{ fontSize: "15px", fontWeight: 800, color: "#fff", margin: 0 }}>
                                Query History
                            </h2>
                            <p style={{ fontSize: "11px", color: "#4B5563", margin: 0 }}>
                                {entries.length} run{entries.length !== 1 ? "s" : ""} this session
                            </p>
                        </div>
                    </div>
                    <div style={{ display: "flex", gap: "8px" }}>
                        {entries.length > 0 && (
                            <button
                                onClick={clearHistory}
                                title="Clear all history"
                                style={{
                                    background: "rgba(239,68,68,0.07)", border: "1px solid rgba(239,68,68,0.15)",
                                    color: "#f87171", borderRadius: "7px", padding: "5px 12px",
                                    fontSize: "11px", fontWeight: 600, cursor: "pointer",
                                }}
                                onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = "rgba(239,68,68,0.14)"}
                                onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = "rgba(239,68,68,0.07)"}
                            >
                                Clear all
                            </button>
                        )}
                        <button
                            onClick={onClose}
                            aria-label="Close history"
                            style={{
                                background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)",
                                color: "#6B7280", borderRadius: "7px", width: "30px", height: "30px",
                                display: "flex", alignItems: "center", justifyContent: "center",
                                cursor: "pointer",
                            }}
                        >
                            <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </button>
                    </div>
                </div>

                {/* Entry list */}
                <div style={{ flex: 1, overflowY: "auto", padding: "14px 16px", display: "flex", flexDirection: "column", gap: "10px" }}>
                    {entries.length === 0 && (
                        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "60px 24px", gap: "12px", textAlign: "center" }}>
                            <div style={{ width: "44px", height: "44px", borderRadius: "12px", background: "rgba(99,102,241,0.08)", border: "1px solid rgba(99,102,241,0.12)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                                <svg width="20" height="20" fill="none" stroke="#4B5563" strokeWidth="2" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                            </div>
                            <p style={{ fontSize: "13px", color: "#4B5563", margin: 0 }}>
                                No queries run yet this session.<br />Run a query in Query Studio to see history here.
                            </p>
                        </div>
                    )}

                    {entries.map(entry => {
                        const isExpanded = expandedId === entry.id;
                        const isSuccess = entry.status === "success";

                        return (
                            <div
                                key={entry.id}
                                style={{
                                    ...card,
                                    border: isSuccess
                                        ? "1px solid rgba(255,255,255,0.07)"
                                        : "1px solid rgba(239,68,68,0.2)",
                                }}
                            >
                                {/* Entry header */}
                                <div
                                    style={{ padding: "12px 14px", cursor: "pointer", display: "flex", flexDirection: "column", gap: "6px" }}
                                    onClick={() => setExpandedId(isExpanded ? null : entry.id)}
                                >
                                    {/* Top row: time + badges */}
                                    <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
                                        <span style={{ fontSize: "10px", color: "#374151", fontFamily: "monospace", flexShrink: 0 }}>
                                            {fmtTime(entry.ranAt)}
                                        </span>
                                        <span style={{
                                            fontSize: "10px", fontWeight: 700,
                                            color: isSuccess ? "#34d399" : "#f87171",
                                            background: isSuccess ? "rgba(16,185,129,0.08)" : "rgba(239,68,68,0.08)",
                                            border: `1px solid ${isSuccess ? "rgba(16,185,129,0.2)" : "rgba(239,68,68,0.2)"}`,
                                            borderRadius: "20px", padding: "1px 8px",
                                        }}>
                                            {isSuccess ? `✓ ${entry.rowCount} row${entry.rowCount !== 1 ? "s" : ""}` : "✗ error"}
                                        </span>
                                        <span style={{ fontSize: "10px", color: "#374151" }}>
                                            {fmtMs(entry.execTimeMs)}
                                        </span>
                                        <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: "4px" }}>
                                            <svg
                                                width="12" height="12" fill="none" stroke="#4B5563" strokeWidth="2" viewBox="0 0 24 24"
                                                style={{ transition: "transform 0.15s", transform: isExpanded ? "rotate(180deg)" : "rotate(0deg)" }}
                                            >
                                                <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
                                            </svg>
                                        </div>
                                    </div>

                                    {/* Prompt chip */}
                                    {entry.prompt && (
                                        <p style={{ fontSize: "12px", color: "#9CA3AF", margin: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                                            <span style={{ color: "#6366f1", fontWeight: 600 }}>⚡</span> {entry.prompt}
                                        </p>
                                    )}

                                    {/* SQL preview */}
                                    <p style={{
                                        fontSize: "11px", color: "#4B5563",
                                        fontFamily: "monospace",
                                        margin: 0,
                                        overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                                    }}>
                                        {entry.sql}
                                    </p>
                                </div>

                                {/* Expanded body */}
                                {isExpanded && (
                                    <div style={{ borderTop: "1px solid rgba(255,255,255,0.06)", padding: "12px 14px", display: "flex", flexDirection: "column", gap: "10px" }}>
                                        {/* Full SQL */}
                                        <div>
                                            <p style={{ fontSize: "10px", fontWeight: 700, color: "#4B5563", textTransform: "uppercase", letterSpacing: "0.08em", margin: "0 0 6px" }}>SQL</p>
                                            <pre style={{
                                                margin: 0, padding: "10px 12px",
                                                background: "rgba(0,0,0,0.3)",
                                                border: "1px solid rgba(255,255,255,0.06)",
                                                borderRadius: "8px",
                                                fontSize: "11px", fontFamily: "monospace",
                                                color: "#a5b4fc", lineHeight: 1.65,
                                                overflowX: "auto", whiteSpace: "pre-wrap", wordBreak: "break-all",
                                            }}>
                                                {entry.sql}
                                            </pre>
                                        </div>

                                        {/* Error message */}
                                        {entry.errorMessage && (
                                            <div style={{ background: "rgba(239,68,68,0.06)", border: "1px solid rgba(239,68,68,0.15)", borderRadius: "8px", padding: "8px 10px" }}>
                                                <p style={{ fontSize: "11px", color: "#f87171", margin: 0, fontFamily: "monospace", wordBreak: "break-word" }}>
                                                    {entry.errorMessage}
                                                </p>
                                            </div>
                                        )}

                                        {/* Action buttons */}
                                        <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
                                            {/* Re-run */}
                                            <button
                                                onClick={() => { onRerun(entry.sql, entry.prompt); onClose(); }}
                                                style={{
                                                    display: "flex", alignItems: "center", gap: "6px",
                                                    padding: "7px 14px", borderRadius: "8px", fontSize: "12px", fontWeight: 700,
                                                    background: "linear-gradient(135deg,#6366f1,#8b5cf6)",
                                                    border: "none", color: "#fff", cursor: "pointer",
                                                    boxShadow: "0 2px 10px rgba(99,102,241,0.25)",
                                                }}
                                                onMouseEnter={e => (e.currentTarget as HTMLElement).style.filter = "brightness(1.1)"}
                                                onMouseLeave={e => (e.currentTarget as HTMLElement).style.filter = "none"}
                                            >
                                                <svg width="12" height="12" fill="currentColor" viewBox="0 0 24 24">
                                                    <polygon points="5 3 19 12 5 21 5 3" />
                                                </svg>
                                                Re-run
                                            </button>

                                            {/* CSV export */}
                                            {isSuccess && entry.rows.length > 0 && (
                                                <>
                                                    <button
                                                        onClick={() => {
                                                            const stem = entry.prompt
                                                                ? entry.prompt.slice(0, 30).replace(/[^a-z0-9]/gi, "_")
                                                                : `query_${entry.id}`;
                                                            exportCSV(entry.columns, entry.rows, `${stem}.csv`);
                                                        }}
                                                        style={{
                                                            display: "flex", alignItems: "center", gap: "6px",
                                                            padding: "7px 14px", borderRadius: "8px", fontSize: "12px", fontWeight: 600,
                                                            background: "rgba(16,185,129,0.08)", border: "1px solid rgba(16,185,129,0.2)",
                                                            color: "#34d399", cursor: "pointer",
                                                        }}
                                                        onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = "rgba(16,185,129,0.15)"}
                                                        onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = "rgba(16,185,129,0.08)"}
                                                    >
                                                        ↓ CSV
                                                    </button>
                                                    <button
                                                        onClick={() => handleExcelExport(entry)}
                                                        disabled={exportingId === entry.id}
                                                        style={{
                                                            display: "flex", alignItems: "center", gap: "6px",
                                                            padding: "7px 14px", borderRadius: "8px", fontSize: "12px", fontWeight: 600,
                                                            background: "rgba(34,197,94,0.08)", border: "1px solid rgba(34,197,94,0.2)",
                                                            color: "#4ade80", cursor: "pointer",
                                                            opacity: exportingId === entry.id ? 0.6 : 1,
                                                        }}
                                                        onMouseEnter={e => { if (exportingId !== entry.id) (e.currentTarget as HTMLElement).style.background = "rgba(34,197,94,0.15)"; }}
                                                        onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = "rgba(34,197,94,0.08)"}
                                                    >
                                                        {exportingId === entry.id ? "…" : "↓ Excel"}
                                                    </button>
                                                </>
                                            )}

                                            {/* Delete */}
                                            <button
                                                onClick={() => removeEntry(entry.id)}
                                                style={{
                                                    marginLeft: "auto",
                                                    display: "flex", alignItems: "center", gap: "5px",
                                                    padding: "7px 12px", borderRadius: "8px", fontSize: "11px",
                                                    background: "rgba(239,68,68,0.06)", border: "1px solid rgba(239,68,68,0.12)",
                                                    color: "#f87171", cursor: "pointer",
                                                }}
                                                onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = "rgba(239,68,68,0.12)"}
                                                onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = "rgba(239,68,68,0.06)"}
                                            >
                                                <svg width="11" height="11" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                                                </svg>
                                                Remove
                                            </button>
                                        </div>
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            </div>

            <style>{`
                @keyframes drawerIn {
                    from { transform: translateX(100%); opacity: 0; }
                    to   { transform: translateX(0);    opacity: 1; }
                }
            `}</style>
        </>
    );
}
