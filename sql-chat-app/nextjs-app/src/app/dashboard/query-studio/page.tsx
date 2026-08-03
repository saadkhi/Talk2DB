"use client";
import React, { useState, useRef, useEffect, useCallback } from "react";
import DataTable from "@/components/data/DataTable";
import SQLEditor from "@/components/SQLEditor";

/* ── Types ───────────────────────────────────────────────────────────────── */
interface ColInfo { name: string; type: string; nullable: boolean; isPrimary: boolean; }
interface TableInfo { name: string; rowCount: number; columns: ColInfo[]; }

interface ColumnHint {
    column: string;
    queriedValue: string;
    actualValues: string[];
    suggestions: string[];
}
interface QueryGuardrail {
    type: "no_results" | "value_mismatch" | "column_not_found";
    message: string;
    hints: ColumnHint[];
}

/* ── Tiny helpers ────────────────────────────────────────────────────────── */
function Spinner({ size = 14, color = "#fff" }: { size?: number; color?: string }) {
    return (
        <div style={{
            width: size, height: size, flexShrink: 0,
            border: `2px solid rgba(255,255,255,0.15)`,
            borderTop: `2px solid ${color}`,
            borderRadius: "50%", animation: "spin 0.7s linear infinite",
        }} />
    );
}

const card: React.CSSProperties = {
    background: "#0d0f1a",
    border: "1px solid rgba(255,255,255,0.08)",
    borderRadius: "12px",
};

const labelStyle: React.CSSProperties = {
    fontSize: "10px", fontWeight: 700, color: "#6B7280",
    textTransform: "uppercase", letterSpacing: "0.08em",
};

/* ── Main page ────────────────────────────────────────────────────────────── */
export default function QueryStudioPage() {

    /* ── schema / table list ── */
    const [tables, setTables]           = useState<TableInfo[]>([]);
    const [loadingSchema, setLoadingSchema] = useState(true);
    const [schemaError, setSchemaError] = useState<string | null>(null);
    const [tableSearch, setTableSearch] = useState("");
    const [selectedTable, setSelectedTable] = useState<TableInfo | null>(null);

    /* ── prompt / SQL ── */
    const [prompt, setPrompt]           = useState("");
    const [generatedSql, setGeneratedSql] = useState("");
    const [editedSql, setEditedSql]     = useState("");
    const [generating, setGenerating]   = useState(false);
    const [genError, setGenError]       = useState<string | null>(null);
    const [copied, setCopied]           = useState(false);

    /* ── query results ── */
    const [running, setRunning]         = useState(false);
    const [columns, setColumns]         = useState<string[]>([]);
    const [rows, setRows]               = useState<any[]>([]);
    const [rowError, setRowError]       = useState<string | null>(null);
    const [hasResult, setHasResult]     = useState(false);
    const [guardrail, setGuardrail]     = useState<QueryGuardrail | null>(null);

    const resultsRef = useRef<HTMLDivElement>(null);

    /* keep edit box in sync when AI generates new SQL */
    useEffect(() => { setEditedSql(generatedSql); }, [generatedSql]);

    /* scroll to results after run */
    useEffect(() => {
        if (hasResult) resultsRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, [hasResult]);

    /* ── load schema on mount ────────────────────────────────────────────── */
    useEffect(() => {
        fetch("/api/schema")
            .then(r => r.json())
            .then(d => {
                if (d.error) throw new Error(d.error);
                setTables(d.tables || []);
            })
            .catch(e => setSchemaError(e.message))
            .finally(() => setLoadingSchema(false));
    }, []);

    /* ── click a table: fill SQL editor + run it ─────────────────────────── */
    const handleTableClick = useCallback(async (t: TableInfo) => {
        setSelectedTable(t);
        const sql = `SELECT * FROM "${t.name}" LIMIT 100`;
        setEditedSql(sql);
        setGeneratedSql(sql);
        setGenError(null);
        setPrompt("");
        setGuardrail(null);

        // auto-run
        setRunning(true);
        setRowError(null); setColumns([]); setRows([]);
        setHasResult(false);
        try {
            const res  = await fetch("/api/query/run", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ sql }),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || "Execution failed");
            setColumns(data.columns ?? []);
            setRows(data.rows ?? []);
            setGuardrail(data.guardrail ?? null);
            setHasResult(true);
        } catch (e: any) {
            setRowError(e.message);
            setHasResult(true);
        } finally {
            setRunning(false);
        }
    }, []);

    /* ── generate SQL from NL prompt ─────────────────────────────────────── */
    const generateSQL = async (q: string) => {
        const trimmed = q.trim();
        if (!trimmed) return;
        setGenerating(true);
        setGenError(null);
        setGeneratedSql("");
        setColumns([]); setRows([]);
        setHasResult(false); setRowError(null); setGuardrail(null);
        setSelectedTable(null);
        try {
            const res  = await fetch("/api/query", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ prompt: trimmed }),
                signal: AbortSignal.timeout(125000),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || "Generation failed");
            setGeneratedSql(data.sql ?? "");
        } catch (e: any) {
            setGenError(e.message);
        } finally {
            setGenerating(false);
        }
    };

    /* ── run current SQL manually ─────────────────────────────────────────── */
    const runSQL = async (sqlOverride?: string) => {
        const sql = (sqlOverride ?? editedSql).trim();
        if (!sql) return;
        setRunning(true);
        setRowError(null); setColumns([]); setRows([]);
        setHasResult(false); setGuardrail(null);
        try {
            const res  = await fetch("/api/query/run", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ sql }),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || "Execution failed");
            setColumns(data.columns ?? []);
            setRows(data.rows ?? []);
            setGuardrail(data.guardrail ?? null);
            setHasResult(true);
        } catch (e: any) {
            setRowError(e.message);
            setHasResult(true);
        } finally {
            setRunning(false);
        }
    };

    /** Replace a bad value in the SQL with a suggested one and re-run */
    const applySuggestion = (hint: ColumnHint, suggestion: string) => {
        // Replace ALL occurrences of the bad value (case-insensitive) in the SQL
        const escaped = hint.queriedValue.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
        const newSql = editedSql.replace(new RegExp(`'${escaped}'`, "gi"), `'${suggestion}'`);
        setEditedSql(newSql);
        runSQL(newSql);
    };

    const handleCopy = () => {
        if (!editedSql) return;
        navigator.clipboard.writeText(editedSql);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    const isDirty = !!generatedSql && editedSql.trim() !== generatedSql.trim();
    const filteredTables = tables.filter(t =>
        t.name.toLowerCase().includes(tableSearch.toLowerCase())
    );

    /* ─────────────────────────────────────────────────────────────────────── */
    return (
        <div style={{ display: "flex", flexDirection: "column", gap: "20px", width: "100%", maxWidth: "1400px", margin: "0 auto" }}>

            {/* ── Page header ── */}
            <div>
                <h1 style={{ fontSize: "22px", fontWeight: 800, color: "#fff", margin: "0 0 4px", letterSpacing: "-0.03em" }}>
                    Query Studio
                </h1>
                <p style={{ fontSize: "13px", color: "#6B7280", margin: 0 }}>
                    Click any table to browse its data, or type a prompt and let Talk2DB generate the SQL.
                </p>
            </div>

            {/* ── Three-column main layout ── */}
            <div style={{
                display: "grid",
                gridTemplateColumns: "220px 1fr",
                gap: "14px",
                alignItems: "start",
            }}>

                {/* ══ LEFT: Table list panel ══════════════════════════════════ */}
                <div style={{
                    ...card,
                    padding: "14px",
                    display: "flex",
                    flexDirection: "column",
                    gap: "10px",
                    position: "sticky",
                    top: "72px",
                    maxHeight: "calc(100vh - 140px)",
                    overflow: "hidden",
                }}>
                    <div style={labelStyle}>
                        Tables {!loadingSchema && `(${tables.length})`}
                    </div>

                    {/* Search box */}
                    <input
                        value={tableSearch}
                        onChange={e => setTableSearch(e.target.value)}
                        placeholder="Search…"
                        style={{
                            background: "#080a12",
                            border: "1px solid rgba(255,255,255,0.08)",
                            borderRadius: "8px",
                            padding: "7px 10px",
                            fontSize: "12px",
                            color: "#fff",
                            outline: "none",
                            width: "100%",
                            boxSizing: "border-box",
                        }}
                    />

                    {/* List */}
                    <div style={{ overflowY: "auto", display: "flex", flexDirection: "column", gap: "2px" }}>
                        {loadingSchema && (
                            <div style={{ display: "flex", alignItems: "center", gap: "8px", padding: "12px 4px", color: "#4B5563", fontSize: "12px" }}>
                                <Spinner size={12} color="#6366f1" />Loading…
                            </div>
                        )}

                        {schemaError && (
                            <p style={{ fontSize: "11px", color: "#f87171", padding: "8px 4px", margin: 0 }}>
                                ⚠ {schemaError}
                            </p>
                        )}

                        {!loadingSchema && !schemaError && filteredTables.length === 0 && (
                            <p style={{ fontSize: "11px", color: "#4B5563", padding: "8px 4px", margin: 0 }}>
                                {tableSearch ? "No match" : "No tables found"}
                            </p>
                        )}

                        {filteredTables.map(t => {
                            const active = selectedTable?.name === t.name;
                            return (
                                <button
                                    key={t.name}
                                    onClick={() => handleTableClick(t)}
                                    title={`${t.name} · ${t.rowCount.toLocaleString()} rows`}
                                    style={{
                                        display: "flex",
                                        alignItems: "center",
                                        justifyContent: "space-between",
                                        padding: "8px 10px",
                                        borderRadius: "8px",
                                        border: active ? "1px solid rgba(99,102,241,0.35)" : "1px solid transparent",
                                        background: active ? "rgba(99,102,241,0.14)" : "transparent",
                                        cursor: "pointer",
                                        textAlign: "left",
                                        width: "100%",
                                        transition: "background 0.12s",
                                        gap: "6px",
                                    }}
                                    onMouseEnter={e => { if (!active) (e.currentTarget as HTMLElement).style.background = "rgba(255,255,255,0.04)"; }}
                                    onMouseLeave={e => { if (!active) (e.currentTarget as HTMLElement).style.background = "transparent"; }}
                                >
                                    {/* DB icon */}
                                    <svg width="12" height="12" fill="none" stroke={active ? "#818cf8" : "#4B5563"}
                                        strokeWidth="2" viewBox="0 0 24 24" style={{ flexShrink: 0 }}>
                                        <path strokeLinecap="round" strokeLinejoin="round"
                                            d="M20.25 6.375c0 2.278-3.694 4.125-8.25 4.125S3.75 8.653 3.75 6.375m16.5 0c0-2.278-3.694-4.125-8.25-4.125S3.75 4.097 3.75 6.375m16.5 0v11.25c0 2.278-3.694 4.125-8.25 4.125s-8.25-1.847-8.25-4.125V6.375m16.5 2.625c0 2.278-3.694 4.125-8.25 4.125s-8.25-1.847-8.25-4.125" />
                                    </svg>

                                    {/* Table name */}
                                    <span style={{
                                        flex: 1,
                                        fontSize: "12px",
                                        fontWeight: active ? 700 : 500,
                                        color: active ? "#fff" : "#9CA3AF",
                                        fontFamily: "monospace",
                                        overflow: "hidden",
                                        textOverflow: "ellipsis",
                                        whiteSpace: "nowrap",
                                    }}>
                                        {t.name}
                                    </span>

                                    {/* Row count badge */}
                                    <span style={{
                                        fontSize: "10px",
                                        color: "#374151",
                                        flexShrink: 0,
                                    }}>
                                        {t.rowCount.toLocaleString()}
                                    </span>
                                </button>
                            );
                        })}
                    </div>
                </div>

                {/* ══ RIGHT: prompt + SQL + results ══════════════════════════ */}
                <div style={{ display: "flex", flexDirection: "column", gap: "14px", minWidth: 0 }}>

                    {/* ── Prompt + SQL editor row ── */}
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "14px", alignItems: "stretch" }}>

                        {/* LEFT card: NL prompt */}
                        <div style={{ ...card, padding: "20px", display: "flex", flexDirection: "column" }}>
                            <form
                                onSubmit={e => { e.preventDefault(); generateSQL(prompt); }}
                                style={{ display: "flex", flexDirection: "column", gap: "12px", flex: 1 }}
                            >
                                <label style={labelStyle}>Natural Language Prompt</label>

                                <div style={{ flex: 1 }}>
                                    <SQLEditor
                                        value={prompt}
                                        onChange={setPrompt}
                                        placeholder="e.g. show me employees whose salary is less than 60000…"
                                        disabled={generating}
                                        minHeight={130}
                                    />
                                </div>

                                {/* Schema hint — tells user the LLM knows their tables */}
                                {tables.length > 0 && (
                                    <div style={{
                                        display: "flex", alignItems: "flex-start", gap: "7px",
                                        padding: "8px 10px", borderRadius: "8px",
                                        background: "rgba(99,102,241,0.06)",
                                        border: "1px solid rgba(99,102,241,0.15)",
                                    }}>
                                        <svg width="12" height="12" fill="none" stroke="#818cf8" strokeWidth="2"
                                            viewBox="0 0 24 24" style={{ flexShrink: 0, marginTop: "1px" }}>
                                            <path strokeLinecap="round" strokeLinejoin="round"
                                                d="M11.25 11.25l.041-.02a.75.75 0 011.063.852l-.708 2.836a.75.75 0 001.063.853l.041-.021M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9-3.75h.008v.008H12V8.25z" />
                                        </svg>
                                        <span style={{ fontSize: "11px", color: "#818cf8", lineHeight: 1.5 }}>
                                            AI knows your schema: <strong style={{ color: "#a5b4fc" }}>
                                                {tables.map(t => t.name).join(", ")}
                                            </strong>
                                        </span>
                                    </div>
                                )}

                                {/* Generate button */}
                                <button
                                    type="submit"
                                    disabled={generating || !prompt.trim()}
                                    style={{
                                        padding: "11px",
                                        borderRadius: "10px",
                                        fontSize: "13px",
                                        fontWeight: 700,
                                        background: (generating || !prompt.trim())
                                            ? "rgba(99,102,241,0.3)"
                                            : "linear-gradient(135deg,#6366f1,#8b5cf6)",
                                        color: "#fff",
                                        border: "none",
                                        cursor: (generating || !prompt.trim()) ? "not-allowed" : "pointer",
                                        boxShadow: (generating || !prompt.trim()) ? "none" : "0 4px 14px rgba(99,102,241,0.3)",
                                        display: "flex", alignItems: "center", justifyContent: "center", gap: "8px",
                                    }}
                                    onMouseEnter={e => { if (!generating) (e.currentTarget as HTMLElement).style.filter = "brightness(1.12)"; }}
                                    onMouseLeave={e => (e.currentTarget as HTMLElement).style.filter = "none"}
                                >
                                    {generating && <Spinner />}
                                    {generating ? "Generating SQL…" : "Generate SQL →"}
                                </button>

                                {/* Gen error */}
                                {genError && (
                                    <div style={{
                                        background: "rgba(239,68,68,0.08)",
                                        border: "1px solid rgba(239,68,68,0.2)",
                                        borderRadius: "10px",
                                        padding: "10px 12px",
                                    }}>
                                        <p style={{ fontSize: "12px", fontWeight: 700, color: "#f87171", margin: "0 0 2px" }}>⚠ Generation Error</p>
                                        <p style={{ fontSize: "11px", color: "#fca5a5", margin: 0, wordBreak: "break-word" }}>{genError}</p>
                                    </div>
                                )}
                            </form>
                        </div>

                        {/* RIGHT card: Generated SQL + run */}
                        <div style={{ ...card, padding: "20px", display: "flex", flexDirection: "column", gap: "12px" }}>

                            {/* Header */}
                            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "8px" }}>
                                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                                    <span style={labelStyle}>Generated SQL</span>
                                    {isDirty && (
                                        <span style={{
                                            fontSize: "10px", fontWeight: 600, color: "#fbbf24",
                                            background: "rgba(251,191,36,0.1)", border: "1px solid rgba(251,191,36,0.2)",
                                            borderRadius: "6px", padding: "2px 7px",
                                        }}>edited</span>
                                    )}
                                    {selectedTable && (
                                        <span style={{
                                            fontSize: "10px", fontWeight: 600, color: "#34d399",
                                            background: "rgba(16,185,129,0.08)", border: "1px solid rgba(16,185,129,0.2)",
                                            borderRadius: "6px", padding: "2px 7px",
                                        }}>{selectedTable.name}</span>
                                    )}
                                </div>
                                <div style={{ display: "flex", gap: "6px" }}>
                                    {isDirty && (
                                        <button onClick={() => setEditedSql(generatedSql)}
                                            style={{
                                                fontSize: "11px", fontWeight: 600, padding: "4px 10px", borderRadius: "7px",
                                                background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)",
                                                color: "#9CA3AF", cursor: "pointer",
                                            }}>↺ Reset</button>
                                    )}
                                    <button onClick={handleCopy} disabled={!editedSql}
                                        style={{
                                            fontSize: "11px", fontWeight: 600, padding: "4px 10px", borderRadius: "7px",
                                            background: copied ? "rgba(16,185,129,0.12)" : "rgba(255,255,255,0.04)",
                                            border: copied ? "1px solid rgba(16,185,129,0.25)" : "1px solid rgba(255,255,255,0.08)",
                                            color: copied ? "#34d399" : "#9CA3AF",
                                            cursor: editedSql ? "pointer" : "not-allowed",
                                            display: "flex", alignItems: "center", gap: "4px",
                                        }}>
                                        {copied ? "✓ Copied" : "Copy"}
                                    </button>
                                </div>
                            </div>

                            {/* SQL editor */}
                            {generating ? (
                                <div style={{
                                    flex: 1, minHeight: 130, borderRadius: "10px",
                                    background: "#080a12", border: "1px solid rgba(255,255,255,0.06)",
                                    display: "flex", alignItems: "center", justifyContent: "center",
                                    gap: "10px", color: "#4B5563", fontSize: "12px",
                                }}>
                                    <Spinner size={18} color="#818cf8" />
                                    Waiting for AI response…
                                </div>
                            ) : (
                                <div style={{ flex: 1 }}>
                                    <SQLEditor
                                        value={editedSql}
                                        onChange={setEditedSql}
                                        placeholder="SQL will appear here — or click a table on the left to auto-fill."
                                        disabled={running}
                                        minHeight={130}
                                    />
                                </div>
                            )}

                            <p style={{ fontSize: "11px", color: "#374151", margin: 0 }}>
                                ✏️ Edit the SQL if needed, then click Run.
                            </p>

                            {/* Run button */}
                            <button
                                onClick={() => runSQL()}
                                disabled={running || !editedSql.trim()}
                                style={{
                                    width: "100%", padding: "12px", borderRadius: "10px",
                                    fontSize: "14px", fontWeight: 700,
                                    background: (running || !editedSql.trim())
                                        ? "rgba(16,185,129,0.25)"
                                        : "linear-gradient(135deg,#10b981,#059669)",
                                    color: "#fff", border: "none",
                                    cursor: (running || !editedSql.trim()) ? "not-allowed" : "pointer",
                                    boxShadow: (running || !editedSql.trim()) ? "none" : "0 4px 14px rgba(16,185,129,0.3)",
                                    display: "flex", alignItems: "center", justifyContent: "center", gap: "8px",
                                }}
                                onMouseEnter={e => { if (!running && editedSql.trim()) (e.currentTarget as HTMLElement).style.filter = "brightness(1.1)"; }}
                                onMouseLeave={e => (e.currentTarget as HTMLElement).style.filter = "none"}
                            >
                                {running && <Spinner />}
                                {running
                                    ? "Running…"
                                    : <><svg width="14" height="14" fill="currentColor" viewBox="0 0 24 24" style={{ flexShrink: 0 }}><polygon points="5 3 19 12 5 21 5 3" /></svg>Run Query</>
                                }
                            </button>
                        </div>
                    </div>

                    {/* ── Results panel ── */}
                    {hasResult && (
                        <div ref={resultsRef} style={{ animation: "fadeUp 0.25s ease" }}>
                            {rowError ? (
                                <div style={{
                                    background: "rgba(239,68,68,0.08)",
                                    border: "1px solid rgba(239,68,68,0.2)",
                                    borderRadius: "12px",
                                    padding: "14px 16px",
                                }}>
                                    <p style={{ fontSize: "12px", fontWeight: 700, color: "#f87171", margin: "0 0 3px" }}>⚠ Execution Error</p>
                                    <p style={{ fontSize: "12px", color: "#fca5a5", margin: 0, fontFamily: "monospace", wordBreak: "break-word" }}>{rowError}</p>
                                </div>
                            ) : (
                                <div style={{ ...card, overflow: "hidden" }}>
                                    {/* Results header */}
                                    <div style={{
                                        display: "flex", alignItems: "center", justifyContent: "space-between",
                                        padding: "14px 18px",
                                        borderBottom: "1px solid rgba(255,255,255,0.06)",
                                        flexWrap: "wrap", gap: "8px",
                                    }}>
                                        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                                            <span style={labelStyle}>Results</span>
                                            {selectedTable && (
                                                <span style={{ fontSize: "13px", fontWeight: 700, color: "#fff", fontFamily: "monospace" }}>
                                                    {selectedTable.name}
                                                </span>
                                            )}
                                        </div>
                                        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                                            <span style={{
                                                fontSize: "11px", color: "#34d399",
                                                background: "rgba(16,185,129,0.08)",
                                                border: "1px solid rgba(16,185,129,0.2)",
                                                borderRadius: "20px",
                                                padding: "3px 10px",
                                                fontWeight: 700,
                                            }}>
                                                {rows.length.toLocaleString()} row{rows.length !== 1 ? "s" : ""} returned
                                            </span>
                                            <span style={{ fontSize: "11px", color: "#4B5563" }}>
                                                {columns.length} col{columns.length !== 1 ? "s" : ""}
                                            </span>
                                        </div>
                                    </div>

                                    {/* Data */}
                                    <div style={{ padding: "16px 18px" }}>
                                        {rows.length === 0 ? (
                                            <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                                                {/* Plain "no rows" message */}
                                                <p style={{ fontSize: "13px", color: "#6B7280", margin: 0 }}>
                                                    Query executed successfully — no rows returned.
                                                </p>

                                                {/* Guardrail hint banner */}
                                                {guardrail && guardrail.hints.length > 0 && (
                                                    <div style={{
                                                        background: "rgba(251,191,36,0.05)",
                                                        border: "1px solid rgba(251,191,36,0.25)",
                                                        borderRadius: "12px",
                                                        padding: "16px 18px",
                                                        display: "flex",
                                                        flexDirection: "column",
                                                        gap: "14px",
                                                    }}>
                                                        {/* Banner header */}
                                                        <div style={{ display: "flex", alignItems: "flex-start", gap: "10px" }}>
                                                            <div style={{
                                                                width: "28px", height: "28px", borderRadius: "8px",
                                                                background: "rgba(251,191,36,0.15)",
                                                                display: "flex", alignItems: "center", justifyContent: "center",
                                                                flexShrink: 0,
                                                            }}>
                                                                <svg width="14" height="14" fill="none" stroke="#fbbf24" strokeWidth="2.5" viewBox="0 0 24 24">
                                                                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
                                                                </svg>
                                                            </div>
                                                            <div>
                                                                <p style={{ fontSize: "13px", fontWeight: 700, color: "#fbbf24", margin: "0 0 4px" }}>
                                                                    No matching data found — here's why
                                                                </p>
                                                                <p style={{ fontSize: "12px", color: "#D1D5DB", margin: 0, lineHeight: 1.55 }}>
                                                                    Your query ran successfully but returned 0 rows. The filter values below don't match
                                                                    anything in the database. Try one of the suggested corrections.
                                                                </p>
                                                            </div>
                                                        </div>

                                                        {/* Per-column hints */}
                                                        <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                                                            {guardrail.hints.map((hint) => (
                                                                <div key={hint.column} style={{
                                                                    background: "rgba(0,0,0,0.25)",
                                                                    borderRadius: "10px",
                                                                    padding: "12px 14px",
                                                                    display: "flex",
                                                                    flexDirection: "column",
                                                                    gap: "10px",
                                                                }}>
                                                                    {/* Column + queried value */}
                                                                    <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
                                                                        <code style={{
                                                                            fontSize: "11px", fontFamily: "monospace",
                                                                            background: "rgba(99,102,241,0.15)",
                                                                            color: "#a5b4fc", padding: "2px 8px",
                                                                            borderRadius: "5px",
                                                                        }}>{hint.column}</code>
                                                                        <span style={{ fontSize: "12px", color: "#9CA3AF" }}>was filtered by</span>
                                                                        <code style={{
                                                                            fontSize: "11px", fontFamily: "monospace",
                                                                            background: "rgba(239,68,68,0.12)",
                                                                            color: "#fca5a5", padding: "2px 8px",
                                                                            borderRadius: "5px",
                                                                            textDecoration: "line-through",
                                                                        }}>'{hint.queriedValue}'</code>
                                                                        <span style={{ fontSize: "11px", color: "#6B7280" }}>— not found in database</span>
                                                                    </div>

                                                                    {/* Suggestions */}
                                                                    {hint.suggestions.length > 0 && (
                                                                        <div>
                                                                            <p style={{ fontSize: "10px", fontWeight: 700, color: "#6B7280", textTransform: "uppercase", letterSpacing: "0.08em", margin: "0 0 6px" }}>
                                                                                Did you mean?
                                                                            </p>
                                                                            <div style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}>
                                                                                {hint.suggestions.map(s => (
                                                                                    <button
                                                                                        key={s}
                                                                                        onClick={() => applySuggestion(hint, s)}
                                                                                        disabled={running}
                                                                                        style={{
                                                                                            padding: "4px 12px", borderRadius: "20px",
                                                                                            fontSize: "12px", fontWeight: 600,
                                                                                            background: "rgba(16,185,129,0.12)",
                                                                                            border: "1px solid rgba(16,185,129,0.3)",
                                                                                            color: "#34d399", cursor: "pointer",
                                                                                            fontFamily: "monospace",
                                                                                            transition: "all 0.15s",
                                                                                        }}
                                                                                        onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = "rgba(16,185,129,0.22)"}
                                                                                        onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = "rgba(16,185,129,0.12)"}
                                                                                    >
                                                                                        ✓ Use '{s}'
                                                                                    </button>
                                                                                ))}
                                                                            </div>
                                                                        </div>
                                                                    )}

                                                                    {/* Actual values sample */}
                                                                    {hint.actualValues.length > 0 && (
                                                                        <div>
                                                                            <p style={{ fontSize: "10px", fontWeight: 700, color: "#6B7280", textTransform: "uppercase", letterSpacing: "0.08em", margin: "0 0 6px" }}>
                                                                                Actual values in <code style={{ fontFamily: "monospace", textTransform: "none" }}>{hint.column}</code>
                                                                            </p>
                                                                            <div style={{ display: "flex", flexWrap: "wrap", gap: "5px" }}>
                                                                                {hint.actualValues.map(v => (
                                                                                    <button
                                                                                        key={v}
                                                                                        onClick={() => applySuggestion(hint, v)}
                                                                                        disabled={running}
                                                                                        style={{
                                                                                            padding: "3px 10px", borderRadius: "20px",
                                                                                            fontSize: "11px", fontWeight: 500,
                                                                                            background: "rgba(255,255,255,0.04)",
                                                                                            border: "1px solid rgba(255,255,255,0.08)",
                                                                                            color: "#9CA3AF", cursor: "pointer",
                                                                                            fontFamily: "monospace",
                                                                                            transition: "all 0.15s",
                                                                                        }}
                                                                                        onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = "rgba(99,102,241,0.4)"; (e.currentTarget as HTMLElement).style.color = "#c7d2fe"; }}
                                                                                        onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = "rgba(255,255,255,0.08)"; (e.currentTarget as HTMLElement).style.color = "#9CA3AF"; }}
                                                                                    >
                                                                                        {v}
                                                                                    </button>
                                                                                ))}
                                                                            </div>
                                                                        </div>
                                                                    )}

                                                                    {/* No match, no suggestions */}
                                                                    {hint.suggestions.length === 0 && hint.actualValues.length === 0 && (
                                                                        <p style={{ fontSize: "12px", color: "#6B7280", margin: 0 }}>
                                                                            The column <code style={{ fontFamily: "monospace", color: "#a5b4fc" }}>{hint.column}</code> appears to have no data or the value type doesn't support text comparison.
                                                                            Please clarify your query.
                                                                        </p>
                                                                    )}
                                                                </div>
                                                            ))}
                                                        </div>

                                                        {/* Clarification prompt */}
                                                        <p style={{ fontSize: "11px", color: "#6B7280", margin: 0, borderTop: "1px solid rgba(255,255,255,0.06)", paddingTop: "10px" }}>
                                                            💡 Click any value above to instantly retry the query with that correction, or update your prompt to match actual data.
                                                        </p>
                                                    </div>
                                                )}

                                                {/* No guardrail but 0 rows — generic clarification */}
                                                {!guardrail && (
                                                    <div style={{
                                                        background: "rgba(99,102,241,0.05)",
                                                        border: "1px solid rgba(99,102,241,0.15)",
                                                        borderRadius: "10px",
                                                        padding: "12px 14px",
                                                        display: "flex", alignItems: "flex-start", gap: "8px",
                                                    }}>
                                                        <svg width="14" height="14" fill="none" stroke="#818cf8" strokeWidth="2" viewBox="0 0 24 24" style={{ flexShrink: 0, marginTop: "1px" }}>
                                                            <path strokeLinecap="round" strokeLinejoin="round" d="M11.25 11.25l.041-.02a.75.75 0 011.063.852l-.708 2.836a.75.75 0 001.063.853l.041-.021M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9-3.75h.008v.008H12V8.25z" />
                                                        </svg>
                                                        <p style={{ fontSize: "12px", color: "#818cf8", margin: 0, lineHeight: 1.55 }}>
                                                            The query is valid but matched no rows. Try browsing the table first to see what values exist, then refine your prompt.
                                                        </p>
                                                    </div>
                                                )}
                                            </div>
                                        ) : (
                                            <DataTable columns={columns} rows={rows} pageSize={25} />
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>

            <style>{`
                @keyframes spin    { to { transform: rotate(360deg); } }
                @keyframes fadeUp  { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: none; } }
            `}</style>
        </div>
    );
}
