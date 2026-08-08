"use client";
import React, { useRef, useEffect, useCallback, useState } from "react";
import DataTable from "@/components/data/DataTable";
import SQLEditor from "@/components/SQLEditor";
import QueryHistoryDrawer from "@/components/dashboard/QueryHistoryDrawer";
import GuestBanner from "@/components/guest/GuestBanner";
import { usePageState } from "@/context/PageStateContext";
import { useQueryHistory } from "@/context/QueryHistoryContext";
import { useGuestGuard } from "@/lib/useGuestGuard";
import { exportCSV, exportExcel } from "@/lib/exportUtils";
import type { TableInfo, ColumnHint, QueryGuardrail } from "@/context/PageStateContext";
import dynamic from "next/dynamic";

const PivotTableWrapper = dynamic(() => import("@/components/PivotTableWrapper"), { ssr: false });

/* ── Tiny helpers ───────────────────────────────────────────────────────── */
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
    border: "1px solid var(--border)",
    borderRadius: "12px",
};

const labelStyle: React.CSSProperties = {
    fontSize: "10px", fontWeight: 700, color: "#6B7280",
    textTransform: "uppercase", letterSpacing: "0.08em",
};

/** Format milliseconds for the elapsed timer */
function fmtElapsed(ms: number) {
    if (ms < 1000) return `${ms}ms`;
    return `${(ms / 1000).toFixed(1)}s`;
}

/* ── Main page ─────────────────────────────────────────────────────────── */
export default function QueryStudioPage() {
    const { queryStudio: s, setQueryStudio: set } = usePageState();
    const { addEntry } = useQueryHistory();
    const { isGuest, sessionReady, trialsLeft, guardedSubmit } = useGuestGuard("query");

    const {
        tables, loadingSchema, schemaError, tableSearch, selectedTable,
        prompt, generatedSql, editedSql,
        columns, rows, results, hasResult, rowError, genError, guardrail,
    } = s;

    const setTables         = (v: TableInfo[])           => set({ tables: v });
    const setLoadingSchema  = (v: boolean)               => set({ loadingSchema: v });
    const setSchemaError    = (v: string | null)         => set({ schemaError: v });
    const setTableSearch    = (v: string)                => set({ tableSearch: v });
    const setSelectedTable  = (v: TableInfo | null)      => set({ selectedTable: v });
    const setPrompt         = (v: string)                => set({ prompt: v });
    const setGeneratedSql   = (v: string)                => set({ generatedSql: v });
    const setEditedSql      = (v: string)                => set({ editedSql: v });
    const setColumns        = (v: string[])              => set({ columns: v });
    const setRows           = (v: any[])                 => set({ rows: v });
    const setResults        = (v: any[] | undefined)     => set({ results: v });
    const setHasResult      = (v: boolean)               => set({ hasResult: v });
    const setRowError       = (v: string | null)         => set({ rowError: v });
    const setGenError       = (v: string | null)         => set({ genError: v });
    const setGuardrail      = (v: QueryGuardrail | null) => set({ guardrail: v });

    const [copied, setCopied] = useState(false);
    const [historyOpen, setHistoryOpen] = useState(false);

    /* transient loading flags */
    const [generating, setGenerating] = useState(false);
    const [running, setRunning] = useState(false);
    const [resultExplanation, setResultExplanation] = useState<string | null>(null);
    const [loadingExplanation, setLoadingExplanation] = useState(false);
    const [followUpQuestions, setFollowUpQuestions] = useState<string[]>([]);
    const [loadingFollowUps, setLoadingFollowUps] = useState(false);
    const [isExplainModalOpen, setIsExplainModalOpen] = useState(false);
    const [explainPlanSummary, setExplainPlanSummary] = useState<string | null>(null);
    const [explainPlanData, setExplainPlanData] = useState<string | null>(null);
    const [explainPlanLoading, setExplainPlanLoading] = useState(false);

    /* save query state */
    const [isSaveModalOpen, setIsSaveModalOpen] = useState(false);
    const [saveTitle, setSaveTitle] = useState("");
    const [saveTags, setSaveTags] = useState("");
    const [savingQuery, setSavingQuery] = useState(false);

    /* query template state */
    const [queryParams, setQueryParams] = useState<Record<string, string>>({});

    /* auto-retry state */
    const [retrying, setRetrying] = useState(false);

    /* result view tab state */
    const [activeResultTab, setActiveResultTab] = useState<"data" | "pivot">("data");

    /* timeout / elapsed-timer state */
    const [elapsedMs, setElapsedMs] = useState(0);
    const elapsedRef = useRef<ReturnType<typeof setInterval> | null>(null);
    const abortRef   = useRef<AbortController | null>(null);

    /* refs */
    const promptCardRef = useRef<HTMLDivElement | null>(null);
    const resultsRef    = useRef<HTMLDivElement>(null);

    /* keep edit box in sync when AI generates new SQL */
    useEffect(() => { setEditedSql(generatedSql); }, [generatedSql]);

    /* scroll to results after run */
    useEffect(() => {
        if (hasResult) resultsRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, [hasResult]);

    /* ── load schema on mount ───────────────────────────────────────────── */
    useEffect(() => {
        // Wait until the session has finished resolving so we know for sure
        // whether the user is authenticated or a guest. Firing before that
        // means we could pull demo tables for someone who is actually logged in.
        if (!sessionReady) return;

        const endpoint = isGuest ? "/api/guest/schema" : "/api/schema";

        // Clear any previously loaded (possibly stale demo) tables before fetching
        setLoadingSchema(true);
        setTables([]);
        setSchemaError(null);

        fetch(endpoint)
            .then(r => r.json())
            .then(d => {
                if (d.error) throw new Error(d.error);
                setTables(d.tables || []);
            })
            .catch(e => setSchemaError(e.message))
            .finally(() => setLoadingSchema(false));
    // Re-runs when session resolves (sessionReady: false→true) and when
    // isGuest changes (e.g. user logs in from the same tab).
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [sessionReady, isGuest]);

    /* ── Elapsed timer helpers ──────────────────────────────────────────── */
    const startTimer = () => {
        setElapsedMs(0);
        elapsedRef.current = setInterval(() => setElapsedMs(p => p + 100), 100);
    };
    const stopTimer = () => {
        if (elapsedRef.current) { clearInterval(elapsedRef.current); elapsedRef.current = null; }
    };

    const cancelRun = () => {
        abortRef.current?.abort();
        stopTimer();
        setRunning(false);
        setRetrying(false);
    };

    /* ── Pin to Dashboard ───────────────────────────────────────────────── */
    const [pinning, setPinning] = useState(false);
    const handlePinToDashboard = async () => {
        if (!editedSql.trim()) return;
        setPinning(true);
        try {
            const res = await fetch("/api/dashboard", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    title: prompt || "Pinned Query",
                    sqlQuery: editedSql.trim(),
                    visualType: activeResultTab === "pivot" ? "pivot" : "table",
                }),
            });
            if (!res.ok) throw new Error("Failed to pin");
            alert("Pinned to Dashboard!");
        } catch (err: any) {
            console.error(err);
            alert("Could not pin to dashboard.");
        } finally {
            setPinning(false);
        }
    };

    /* ── Global keyboard shortcuts ──────────────────────────────────────── */
    useEffect(() => {
        const handler = (e: KeyboardEvent) => {
            const mod = e.metaKey || e.ctrlKey;
            if (!mod) return;

            if (e.key === "Enter") {
                e.preventDefault();
                if (!running && editedSql.trim()) runSQL();
            }
            if (e.key === "k" || e.key === "K") {
                e.preventDefault();
                // Focus the textarea inside the prompt card
                promptCardRef.current?.querySelector("textarea")?.focus();
            }
            if (e.key === "e" || e.key === "E") {
                e.preventDefault();
                if (rows.length > 0 && columns.length > 0) {
                    const stem = prompt ? prompt.slice(0, 30).replace(/[^a-z0-9]/gi, "_") : "query_results";
                    exportCSV(columns, rows, `${stem}.csv`);
                }
            }
        };
        window.addEventListener("keydown", handler);
        return () => window.removeEventListener("keydown", handler);
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [running, editedSql, rows, columns, prompt]);

    /* ── runSQL — executes SQL, records history, auto-retries on DB error ── */
    const runSQL = useCallback(async (sqlOverride?: string, promptOverride?: string, _retryCount = 0) => {
        let sql = (sqlOverride ?? editedSql).trim();
        const activePrompt = promptOverride ?? prompt;
        if (!sql) return;

        // Apply query template parameters
        const paramRegex = /\{([a-zA-Z0-9_]+)\}/g;
        sql = sql.replace(paramRegex, (match, paramName) => {
            return queryParams[paramName] !== undefined && queryParams[paramName] !== "" 
                ? queryParams[paramName] 
                : match;
        });

        abortRef.current = new AbortController();
        setRunning(true);
        setRowError(null); setColumns([]); setRows([]); setResults([]);
        setHasResult(false); setGuardrail(null);
        setResultExplanation(null); setFollowUpQuestions([]);
        startTimer();
        const t0 = Date.now();

        try {
            const runEndpoint = isGuest ? "/api/guest/query" : "/api/query/run";
            const res = await fetch(runEndpoint, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ sql }),
                signal: abortRef.current.signal,
            });
            const data = await res.json();
            const execTimeMs = Date.now() - t0;
            stopTimer();

            if (!res.ok) {
                const errMsg: string = data.error || "Execution failed";

                /* ── Auto-retry: ask LLM to fix the SQL (max 1 retry) ──── */
                if (_retryCount === 0 && res.status === 422) {
                    setRetrying(true);
                    setRunning(false);
                    try {
                        const fixRes = await fetch("/api/query", {
                            method: "POST",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({
                                prompt: `The following SQL produced a database error. Fix it.\n\nOriginal SQL:\n${sql}\n\nDatabase error:\n${errMsg}`,
                            }),
                            signal: AbortSignal.timeout(60000),
                        });
                        const fixData = await fixRes.json();
                        if (fixRes.ok && fixData.sql) {
                            setGeneratedSql(fixData.sql);
                            setEditedSql(fixData.sql);
                            setRetrying(false);
                            // Re-run with fixed SQL (no further retry)
                            await runSQL(fixData.sql, activePrompt, 1);
                            return;
                        }
                    } catch {
                        // fall through to show the original error
                    }
                    setRetrying(false);
                }

                // Record failed run in history
                addEntry({
                    prompt: activePrompt, sql, columns: [], rows: [],
                    rowCount: 0, execTimeMs, status: "error", errorMessage: errMsg,
                    ranAt: new Date(),
                });
                setRowError(errMsg);
                setHasResult(true);
                return;
            }

            setColumns(data.columns ?? []);
            setRows(data.rows ?? []);
            setResults(data.results ?? []);
            setGuardrail(data.guardrail ?? null);
            setHasResult(true);

            // Record successful run in history
            addEntry({
                prompt: activePrompt, sql,
                columns: data.columns ?? [], rows: data.rows ?? [],
                rowCount: (data.rows ?? []).length,
                execTimeMs, status: "success",
                ranAt: new Date(),
            });

            // Trigger AI Explanations and Follow-ups
            if (!isGuest && sql.trim() && (data.rows ?? []).length > 0) {
                setLoadingExplanation(true);
                fetch("/api/query/explain-result", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ sql, prompt: activePrompt, rows: (data.rows ?? []).slice(0, 5) }),
                })
                .then(r => r.json())
                .then(d => { if (d.explanation) setResultExplanation(d.explanation); })
                .catch(e => console.error(e))
                .finally(() => setLoadingExplanation(false));

                setLoadingFollowUps(true);
                fetch("/api/query/suggest-followups", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ sql }),
                })
                .then(r => r.json())
                .then(d => { if (d.suggestions) setFollowUpQuestions(d.suggestions); })
                .catch(e => console.error(e))
                .finally(() => setLoadingFollowUps(false));
            }
        } catch (e: any) {
            stopTimer();
            if (e?.name === "AbortError") return; // user cancelled — no history entry
            const execTimeMs = Date.now() - t0;
            const errMsg = e.message || "Execution failed";
            addEntry({
                prompt: activePrompt, sql, columns: [], rows: [],
                rowCount: 0, execTimeMs, status: "error", errorMessage: errMsg,
                ranAt: new Date(),
            });
            setRowError(errMsg);
            setHasResult(true);
        } finally {
            stopTimer();
            setRunning(false);
            setRetrying(false);
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [editedSql, prompt, addEntry]);

    /* ── click a table: fill SQL editor + run it ─────────────────────────── */
    const handleTableClick = useCallback(async (t: TableInfo) => {
        setSelectedTable(t);
        const sql = `SELECT * FROM "${t.name}" LIMIT 100`;
        setEditedSql(sql);
        setGeneratedSql(sql);
        setGenError(null);
        setPrompt("");
        setGuardrail(null);
        await guardedSubmit(() => runSQL(sql, ""));
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [runSQL, guardedSubmit]);

    /* ── generate SQL from NL prompt ─────────────────────────────────────── */
    const generateSQL = async (q: string) => {
        const trimmed = q.trim();
        if (!trimmed) return;
        const blocked = await guardedSubmit(async () => {
            setGenerating(true);
            setGenError(null);
            setGeneratedSql("");
            setColumns([]); setRows([]);
            setHasResult(false); setRowError(null); setGuardrail(null);
            setSelectedTable(null);
            try {
                const res = await fetch("/api/query", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ prompt: trimmed, previousSql: editedSql, previousPrompt: prompt }),
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
        });
        if (blocked) return;
    };

    /** Replace a bad value in the SQL with a suggested one and re-run */
    const applySuggestion = (hint: ColumnHint, suggestion: string) => {
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

    const handleExplainQuery = async () => {
        if (!editedSql.trim()) return;
        setIsExplainModalOpen(true);
        setExplainPlanLoading(true);
        setExplainPlanData(null);
        setExplainPlanSummary(null);
        try {
            const res = await fetch("/api/query/explain-plan", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ sql: editedSql }),
            });
            const data = await res.json();
            if (res.ok) {
                setExplainPlanData(data.plan);
                setExplainPlanSummary(data.summary);
            } else {
                setExplainPlanSummary(`Error: ${data.error}`);
            }
        } catch (e: any) {
            setExplainPlanSummary(`Error: ${e.message}`);
        } finally {
            setExplainPlanLoading(false);
        }
    };

    const handleSaveQuery = async () => {
        if (!saveTitle.trim() || !editedSql.trim()) return;
        setSavingQuery(true);
        try {
            const tags = saveTags.split(",").map(t => t.trim()).filter(Boolean);
            const res = await fetch("/api/query/saved", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ title: saveTitle, sql: editedSql, tags }),
            });
            if (!res.ok) {
                const d = await res.json();
                throw new Error(d.error);
            }
            setIsSaveModalOpen(false);
            setSaveTitle("");
            setSaveTags("");
            alert("Query saved to library!");
        } catch (e: any) {
            alert(e.message || "Failed to save query");
        } finally {
            setSavingQuery(false);
        }
    };

    /* Re-run handler called from the history drawer */
    const handleRerun = (sql: string, p: string) => {
        setEditedSql(sql);
        setGeneratedSql(sql);
        if (p) setPrompt(p);
        runSQL(sql, p);
    };

    const isDirty = !!generatedSql && editedSql.trim() !== generatedSql.trim();
    const filteredTables = tables.filter(t =>
        t.name.toLowerCase().includes(tableSearch.toLowerCase())
    );

    /* Export filename derived from the current prompt */
    const exportStem = prompt
        ? prompt.slice(0, 40).replace(/[^a-z0-9]/gi, "_").replace(/_+/g, "_").replace(/^_|_$/g, "")
        : selectedTable?.name ?? "query_results";

    /* ─────────────────────────────────────────────────────────────────────── */
    return (
        <div style={{ display: "flex", flexDirection: "column", gap: "20px", width: "100%", maxWidth: "1400px", margin: "0 auto" }}>

            <GuestBanner tool="query" />

            {/* ── Page header ── */}
            <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: "12px", flexWrap: "wrap" }}>
                <div>
                    <h1 style={{ fontSize: "22px", fontWeight: 800, color: "var(--text-primary)", margin: "0 0 4px", letterSpacing: "-0.03em" }}>
                        Query Studio
                    </h1>
                    <p style={{ fontSize: "13px", color: "#6B7280", margin: 0 }}>
                        Click any table to browse its data, or type a prompt and let Talk2DB generate the SQL.
                        <span style={{ marginLeft: "10px", color: "#374151" }}>
                            ⌘↵ run · ⌘K focus prompt · ⌘E export
                        </span>
                    </p>
                </div>

                {/* History button */}
                <button
                    onClick={() => setHistoryOpen(true)}
                    style={{
                        display: "flex", alignItems: "center", gap: "8px",
                        padding: "8px 16px", borderRadius: "10px",
                        background: "rgba(99,102,241,0.08)", border: "1px solid rgba(99,102,241,0.2)",
                        color: "#818cf8", fontSize: "12px", fontWeight: 700, cursor: "pointer",
                        transition: "all 0.15s",
                    }}
                    onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = "rgba(99,102,241,0.15)"}
                    onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = "rgba(99,102,241,0.08)"}
                    title="View query history (this session)"
                >
                    <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    History
                </button>
            </div>

            {/* ── Three-column main layout ── */}
            <div style={{ display: "grid", gridTemplateColumns: "220px 1fr", gap: "14px", alignItems: "start" }}>

                {/* ══ LEFT: Table list panel ══════════════════════════════ */}
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
                    <div style={labelStyle}>Tables {!loadingSchema && `(${tables.length})`}</div>
                    <input
                        value={tableSearch}
                        onChange={e => setTableSearch(e.target.value)}
                        placeholder="Search…"
                        style={{
                            background: "var(--bg-base)", border: "1px solid var(--border)",
                            borderRadius: "8px", padding: "7px 10px",
                            fontSize: "12px", color: "var(--text-primary)", outline: "none",
                            width: "100%", boxSizing: "border-box",
                        }}
                    />

                    <div style={{ overflowY: "auto", display: "flex", flexDirection: "column", gap: "2px" }}>
                        {loadingSchema && (
                            <div style={{ display: "flex", alignItems: "center", gap: "8px", padding: "12px 4px", color: "#4B5563", fontSize: "12px" }}>
                                <Spinner size={12} color="#6366f1" />Loading…
                            </div>
                        )}
                        {schemaError && <p style={{ fontSize: "11px", color: "#f87171", padding: "8px 4px", margin: 0 }}>⚠ {schemaError}</p>}
                        {!loadingSchema && !schemaError && filteredTables.length === 0 && (
                            <p style={{ fontSize: "11px", color: "#4B5563", padding: "8px 4px", margin: 0 }}>
                                {tableSearch ? "No match" : "No tables found"}
                            </p>
                        )}
                        {filteredTables.map(t => {
                            const active = selectedTable?.name === t.name;
                            return (
                                <button key={t.name} onClick={() => handleTableClick(t)}
                                    title={`${t.name} · ${t.rowCount.toLocaleString()} rows`}
                                    style={{
                                        display: "flex", alignItems: "center", justifyContent: "space-between",
                                        padding: "8px 10px", borderRadius: "8px",
                                        border: active ? "1px solid rgba(99,102,241,0.35)" : "1px solid transparent",
                                        background: active ? "rgba(99,102,241,0.14)" : "transparent",
                                        cursor: "pointer", textAlign: "left", width: "100%", transition: "background 0.12s", gap: "6px",
                                    }}
                                    onMouseEnter={e => { if (!active) (e.currentTarget as HTMLElement).style.background = "rgba(255,255,255,0.04)"; }}
                                    onMouseLeave={e => { if (!active) (e.currentTarget as HTMLElement).style.background = "transparent"; }}
                                >
                                    <svg width="12" height="12" fill="none" stroke={active ? "#818cf8" : "#4B5563"} strokeWidth="2" viewBox="0 0 24 24" style={{ flexShrink: 0 }}>
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M20.25 6.375c0 2.278-3.694 4.125-8.25 4.125S3.75 8.653 3.75 6.375m16.5 0c0-2.278-3.694-4.125-8.25-4.125S3.75 4.097 3.75 6.375m16.5 0v11.25c0 2.278-3.694 4.125-8.25 4.125s-8.25-1.847-8.25-4.125V6.375m16.5 2.625c0 2.278-3.694 4.125-8.25 4.125s-8.25-1.847-8.25-4.125" />
                                    </svg>
                                    <span style={{ flex: 1, fontSize: "12px", fontWeight: active ? 700 : 500, color: active ? "#fff" : "#9CA3AF", fontFamily: "monospace", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{t.name}</span>
                                    <span style={{ fontSize: "10px", color: "#374151", flexShrink: 0 }}>{t.rowCount.toLocaleString()}</span>
                                </button>
                            );
                        })}
                    </div>

                    {selectedTable && selectedTable.columns.length > 0 && (
                        <div style={{ borderTop: "1px solid rgba(255,255,255,0.06)", paddingTop: "10px", display: "flex", flexDirection: "column", gap: "6px" }}>
                            <div style={{ ...labelStyle, fontSize: "9px" }}>{selectedTable.name} · {selectedTable.columns.length} cols</div>
                            <div style={{ display: "flex", flexDirection: "column", gap: "1px", overflowY: "auto" }}>
                                {selectedTable.columns.map(col => (
                                    <div key={col.name} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "4px 6px", borderRadius: "5px", gap: "6px" }}>
                                        <div style={{ display: "flex", alignItems: "center", gap: "5px", minWidth: 0 }}>
                                            {col.isPrimary && <span style={{ fontSize: "9px", flexShrink: 0 }}>🔑</span>}
                                            <span style={{ fontSize: "11px", fontFamily: "monospace", color: col.isPrimary ? "#fbbf24" : "#D1D5DB", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{col.name}</span>
                                        </div>
                                        <span style={{ fontSize: "9px", color: "#374151", flexShrink: 0, fontFamily: "monospace" }}>
                                            {col.type.replace("character varying", "varchar").replace("timestamp without time zone", "ts")}
                                        </span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>

                {/* ══ RIGHT: prompt + SQL + results ═════════════════════ */}
                <div style={{ display: "flex", flexDirection: "column", gap: "14px", minWidth: 0 }}>

                    {/* ── Prompt + SQL editor row ── */}
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "14px", alignItems: "stretch" }}>

                        {/* LEFT card: NL prompt */}
                        <div ref={promptCardRef} style={{ ...card, padding: "20px", display: "flex", flexDirection: "column" }}>
                            <form onSubmit={e => { e.preventDefault(); generateSQL(prompt); }}
                                style={{ display: "flex", flexDirection: "column", gap: "12px", flex: 1 }}>
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

                                {tables.length > 0 && (
                                    <div style={{ display: "flex", alignItems: "flex-start", gap: "7px", padding: "8px 10px", borderRadius: "8px", background: "rgba(99,102,241,0.06)", border: "1px solid rgba(99,102,241,0.15)" }}>
                                        <svg width="12" height="12" fill="none" stroke="#818cf8" strokeWidth="2" viewBox="0 0 24 24" style={{ flexShrink: 0, marginTop: "1px" }}>
                                            <path strokeLinecap="round" strokeLinejoin="round" d="M11.25 11.25l.041-.02a.75.75 0 011.063.852l-.708 2.836a.75.75 0 001.063.853l.041-.021M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9-3.75h.008v.008H12V8.25z" />
                                        </svg>
                                        <span style={{ fontSize: "11px", color: "#818cf8", lineHeight: 1.5 }}>
                                            AI knows your schema: <strong style={{ color: "#a5b4fc" }}>{tables.map(t => t.name).join(", ")}</strong>
                                        </span>
                                    </div>
                                )}

                                <button type="submit" disabled={generating || !prompt.trim()}
                                    style={{
                                        padding: "11px", borderRadius: "10px", fontSize: "13px", fontWeight: 700,
                                        background: (generating || !prompt.trim()) ? "rgba(99,102,241,0.3)" : "linear-gradient(135deg,#6366f1,#8b5cf6)",
                                        color: "var(--text-primary)", border: "none",
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

                                {genError && (
                                    <div style={{ background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.2)", borderRadius: "10px", padding: "10px 12px" }}>
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
                                    {isDirty && <span style={{ fontSize: "10px", fontWeight: 600, color: "#fbbf24", background: "rgba(251,191,36,0.1)", border: "1px solid rgba(251,191,36,0.2)", borderRadius: "6px", padding: "2px 7px" }}>edited</span>}
                                    {selectedTable && <span style={{ fontSize: "10px", fontWeight: 600, color: "#34d399", background: "rgba(16,185,129,0.08)", border: "1px solid rgba(16,185,129,0.2)", borderRadius: "6px", padding: "2px 7px" }}>{selectedTable.name}</span>}
                                </div>
                                <div style={{ display: "flex", gap: "6px" }}>
                                    {isDirty && (
                                        <button onClick={() => setEditedSql(generatedSql)}
                                            style={{ fontSize: "11px", fontWeight: 600, padding: "4px 10px", borderRadius: "7px", background: "rgba(255,255,255,0.04)", border: "1px solid var(--border)", color: "var(--text-secondary)", cursor: "pointer" }}>↺ Reset</button>
                                    )}
                                    <button onClick={handleCopy} disabled={!editedSql}
                                        style={{ fontSize: "11px", fontWeight: 600, padding: "4px 10px", borderRadius: "7px", background: copied ? "rgba(16,185,129,0.12)" : "rgba(255,255,255,0.04)", border: copied ? "1px solid rgba(16,185,129,0.25)" : "1px solid rgba(255,255,255,0.08)", color: copied ? "#34d399" : "#9CA3AF", cursor: editedSql ? "pointer" : "not-allowed", display: "flex", alignItems: "center", gap: "4px" }}>
                                        {copied ? "✓ Copied" : "Copy"}
                                    </button>
                                </div>
                            </div>

                            {/* SQL editor */}
                            {generating ? (
                                <div style={{ flex: 1, minHeight: 130, borderRadius: "10px", background: "var(--bg-base)", border: "1px solid rgba(255,255,255,0.06)", display: "flex", alignItems: "center", justifyContent: "center", gap: "10px", color: "#4B5563", fontSize: "12px" }}>
                                    <Spinner size={18} color="#818cf8" />Waiting for AI response…
                                </div>
                            ) : (
                                <div style={{ flex: 1, display: "flex", flexDirection: "column" }}>
                                    {Array.from(new Set(Array.from(editedSql.matchAll(/\{([a-zA-Z0-9_]+)\}/g)).map(m => m[1]))).length > 0 && (
                                        <div style={{ background: "rgba(99,102,241,0.06)", borderBottom: "1px solid rgba(255,255,255,0.06)", padding: "12px 20px", display: "flex", gap: "16px", flexWrap: "wrap", alignItems: "center" }}>
                                            <span style={{ fontSize: "11px", fontWeight: 700, color: "#818cf8", textTransform: "uppercase", letterSpacing: "0.05em" }}>Parameters</span>
                                            {Array.from(new Set(Array.from(editedSql.matchAll(/\{([a-zA-Z0-9_]+)\}/g)).map(m => m[1]))).map(param => (
                                                <div key={param} style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                                                    <label style={{ fontSize: "12px", color: "#D1D5DB" }}>{param}</label>
                                                    <input 
                                                        value={queryParams[param] || ""}
                                                        onChange={e => setQueryParams(prev => ({ ...prev, [param]: e.target.value }))}
                                                        placeholder="value"
                                                        style={{ background: "var(--bg-base)", border: "1px solid rgba(255,255,255,0.15)", borderRadius: "6px", padding: "4px 8px", color: "var(--text-primary)", fontSize: "12px", outline: "none", width: "100px" }}
                                                    />
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                    <SQLEditor value={editedSql} onChange={setEditedSql}
                                        placeholder="SQL will appear here — or click a table on the left to auto-fill."
                                        disabled={running} minHeight={130} />
                                </div>
                            )}

                            <p style={{ fontSize: "11px", color: "#374151", margin: 0 }}>✏️ Edit the SQL if needed, then click Run or press ⌘↵</p>

                            {/* Run / Cancel button + elapsed timer */}
                            <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
                                {running ? (
                                    <>
                                        <div style={{ flex: 1, padding: "12px", borderRadius: "10px", fontSize: "14px", fontWeight: 700, background: "rgba(16,185,129,0.1)", border: "1px solid rgba(16,185,129,0.2)", color: "#34d399", display: "flex", alignItems: "center", justifyContent: "center", gap: "8px" }}>
                                            <Spinner color="#34d399" />
                                            {retrying ? "Auto-fixing SQL…" : `Running… ${fmtElapsed(elapsedMs)}`}
                                        </div>
                                        <button
                                            onClick={cancelRun}
                                            title="Cancel query"
                                            style={{ padding: "12px 16px", borderRadius: "10px", fontSize: "13px", fontWeight: 700, background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.25)", color: "#f87171", cursor: "pointer", display: "flex", alignItems: "center", gap: "6px", flexShrink: 0 }}
                                            onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = "rgba(239,68,68,0.18)"}
                                            onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = "rgba(239,68,68,0.1)"}
                                        >
                                            <svg width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                                                <rect x="6" y="6" width="12" height="12" rx="2" />
                                            </svg>
                                            Cancel
                                        </button>
                                    </>
                                ) : (
                                    <>
                                        <button onClick={() => runSQL()} disabled={!editedSql.trim()}
                                            style={{
                                                flex: 1, padding: "12px", borderRadius: "10px", fontSize: "14px", fontWeight: 700,
                                                background: !editedSql.trim() ? "rgba(16,185,129,0.25)" : "linear-gradient(135deg,#10b981,#059669)",
                                                color: "var(--text-primary)", border: "none",
                                                cursor: !editedSql.trim() ? "not-allowed" : "pointer",
                                                boxShadow: !editedSql.trim() ? "none" : "0 4px 14px rgba(16,185,129,0.3)",
                                                display: "flex", alignItems: "center", justifyContent: "center", gap: "8px",
                                            }}
                                            onMouseEnter={e => { if (editedSql.trim()) (e.currentTarget as HTMLElement).style.filter = "brightness(1.1)"; }}
                                            onMouseLeave={e => (e.currentTarget as HTMLElement).style.filter = "none"}
                                        >
                                            <svg width="14" height="14" fill="currentColor" viewBox="0 0 24 24" style={{ flexShrink: 0 }}><polygon points="5 3 19 12 5 21 5 3" /></svg>
                                            Run Query
                                        </button>
                                        <button onClick={handleExplainQuery} disabled={!editedSql.trim()}
                                            style={{
                                                padding: "12px 16px", borderRadius: "10px", fontSize: "13px", fontWeight: 700,
                                                background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)",
                                                color: "var(--text-primary)", cursor: !editedSql.trim() ? "not-allowed" : "pointer",
                                                display: "flex", alignItems: "center", gap: "6px", flexShrink: 0
                                            }}
                                            onMouseEnter={e => { if (editedSql.trim()) (e.currentTarget as HTMLElement).style.background = "rgba(255,255,255,0.1)"; }}
                                            onMouseLeave={e => { if (editedSql.trim()) (e.currentTarget as HTMLElement).style.background = "rgba(255,255,255,0.05)"; }}
                                        >
                                            Explain
                                        </button>
                                        <button onClick={() => setIsSaveModalOpen(true)} disabled={!editedSql.trim()}
                                            style={{
                                                padding: "12px 16px", borderRadius: "10px", fontSize: "13px", fontWeight: 700,
                                                background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)",
                                                color: "var(--text-primary)", cursor: !editedSql.trim() ? "not-allowed" : "pointer",
                                                display: "flex", alignItems: "center", gap: "6px", flexShrink: 0
                                            }}
                                            onMouseEnter={e => { if (editedSql.trim()) (e.currentTarget as HTMLElement).style.background = "rgba(255,255,255,0.1)"; }}
                                            onMouseLeave={e => { if (editedSql.trim()) (e.currentTarget as HTMLElement).style.background = "rgba(255,255,255,0.05)"; }}
                                        >
                                            <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M17.593 3.322c1.1.128 1.907 1.077 1.907 2.185V21L12 17.25 4.5 21V5.507c0-1.108.806-2.057 1.907-2.185a48.507 48.507 0 0111.186 0z" /></svg>
                                            Save
                                        </button>
                                    </>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* ── Results panel ── */}
                    {hasResult && (
                        <div ref={resultsRef} style={{ animation: "fadeUp 0.25s ease" }}>
                            {rowError ? (
                                <div style={{ background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.2)", borderRadius: "12px", padding: "14px 16px" }}>
                                    <p style={{ fontSize: "12px", fontWeight: 700, color: "#f87171", margin: "0 0 3px" }}>⚠ Execution Error</p>
                                    <p style={{ fontSize: "12px", color: "#fca5a5", margin: 0, fontFamily: "monospace", wordBreak: "break-word" }}>{rowError}</p>
                                </div>
                            ) : (
                                <div style={{ ...card, overflow: "hidden" }}>
                                    {/* Results header */}
                                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 18px", borderBottom: "1px solid rgba(255,255,255,0.06)", flexWrap: "wrap", gap: "8px" }}>
                                        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                                            <span style={labelStyle}>Results</span>
                                            {selectedTable && <span style={{ fontSize: "13px", fontWeight: 700, color: "var(--text-primary)", fontFamily: "monospace" }}>{selectedTable.name}</span>}
                                        </div>
                                        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                                            <span style={{ fontSize: "11px", color: "#34d399", background: "rgba(16,185,129,0.08)", border: "1px solid rgba(16,185,129,0.2)", borderRadius: "20px", padding: "3px 10px", fontWeight: 700 }}>
                                                {rows.length.toLocaleString()} row{rows.length !== 1 ? "s" : ""} returned
                                            </span>
                                            <span style={{ fontSize: "11px", color: "#4B5563" }}>{columns.length} col{columns.length !== 1 ? "s" : ""}</span>
                                            {/* Quick export buttons in results header */}
                                            {rows.length > 0 && (
                                                <div style={{ display: "flex", gap: "6px" }}>
                                                    <button onClick={() => exportCSV(columns, rows, `${exportStem}.csv`)}
                                                        title="Export CSV (⌘E)"
                                                        style={{ display: "flex", alignItems: "center", gap: "4px", padding: "4px 10px", borderRadius: "7px", fontSize: "11px", fontWeight: 600, background: "rgba(16,185,129,0.08)", border: "1px solid rgba(16,185,129,0.2)", color: "#34d399", cursor: "pointer" }}
                                                        onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = "rgba(16,185,129,0.15)"}
                                                        onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = "rgba(16,185,129,0.08)"}
                                                    >↓ CSV</button>
                                                    <button onClick={() => exportExcel(columns, rows, `${exportStem}.xlsx`)}
                                                        title="Export Excel"
                                                        style={{ display: "flex", alignItems: "center", gap: "4px", padding: "4px 10px", borderRadius: "7px", fontSize: "11px", fontWeight: 600, background: "rgba(34,197,94,0.08)", border: "1px solid rgba(34,197,94,0.2)", color: "#4ade80", cursor: "pointer" }}
                                                        onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = "rgba(34,197,94,0.15)"}
                                                        onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = "rgba(34,197,94,0.08)"}
                                                    >↓ Excel</button>
                                                    <button onClick={handlePinToDashboard}
                                                        disabled={pinning}
                                                        title="Pin to Dashboard"
                                                        style={{ display: "flex", alignItems: "center", gap: "4px", padding: "4px 10px", borderRadius: "7px", fontSize: "11px", fontWeight: 600, background: "rgba(139,92,246,0.08)", border: "1px solid rgba(139,92,246,0.2)", color: "#c4b5fd", cursor: pinning ? "not-allowed" : "pointer" }}
                                                        onMouseEnter={e => { if (!pinning) (e.currentTarget as HTMLElement).style.background = "rgba(139,92,246,0.15)"; }}
                                                        onMouseLeave={e => { if (!pinning) (e.currentTarget as HTMLElement).style.background = "rgba(139,92,246,0.08)"; }}
                                                    >
                                                        {pinning ? "…" : "📌 Pin"}
                                                    </button>
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    {/* Data */}
                                    <div style={{ padding: "16px 18px" }}>
                                        {rows.length === 0 ? (
                                            <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                                                <p style={{ fontSize: "13px", color: "#6B7280", margin: 0 }}>Query executed successfully — no rows returned.</p>
                                                {guardrail && guardrail.hints.length > 0 && (
                                                    <div style={{ background: "rgba(251,191,36,0.05)", border: "1px solid rgba(251,191,36,0.25)", borderRadius: "12px", padding: "16px 18px", display: "flex", flexDirection: "column", gap: "14px" }}>
                                                        <div style={{ display: "flex", alignItems: "flex-start", gap: "10px" }}>
                                                            <div style={{ width: "28px", height: "28px", borderRadius: "8px", background: "rgba(251,191,36,0.15)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                                                                <svg width="14" height="14" fill="none" stroke="#fbbf24" strokeWidth="2.5" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" /></svg>
                                                            </div>
                                                            <div>
                                                                <p style={{ fontSize: "13px", fontWeight: 700, color: "#fbbf24", margin: "0 0 4px" }}>No matching data found — here's why</p>
                                                                <p style={{ fontSize: "12px", color: "#D1D5DB", margin: 0, lineHeight: 1.55 }}>Your query ran successfully but returned 0 rows. The filter values below don't match anything in the database.</p>
                                                            </div>
                                                        </div>
                                                        <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                                                            {guardrail.hints.map((hint) => (
                                                                <div key={hint.column} style={{ background: "rgba(0,0,0,0.25)", borderRadius: "10px", padding: "12px 14px", display: "flex", flexDirection: "column", gap: "10px" }}>
                                                                    <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
                                                                        <code style={{ fontSize: "11px", fontFamily: "monospace", background: "rgba(99,102,241,0.15)", color: "#a5b4fc", padding: "2px 8px", borderRadius: "5px" }}>{hint.column}</code>
                                                                        <span style={{ fontSize: "12px", color: "var(--text-secondary)" }}>was filtered by</span>
                                                                        <code style={{ fontSize: "11px", fontFamily: "monospace", background: "rgba(239,68,68,0.12)", color: "#fca5a5", padding: "2px 8px", borderRadius: "5px", textDecoration: "line-through" }}>'{hint.queriedValue}'</code>
                                                                    </div>
                                                                    {hint.suggestions.length > 0 && (
                                                                        <div>
                                                                            <p style={{ fontSize: "10px", fontWeight: 700, color: "#6B7280", textTransform: "uppercase", letterSpacing: "0.08em", margin: "0 0 6px" }}>Did you mean?</p>
                                                                            <div style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}>
                                                                                {hint.suggestions.map(s => (
                                                                                    <button key={s} onClick={() => applySuggestion(hint, s)} disabled={running}
                                                                                        style={{ padding: "4px 12px", borderRadius: "20px", fontSize: "12px", fontWeight: 600, background: "rgba(16,185,129,0.12)", border: "1px solid rgba(16,185,129,0.3)", color: "#34d399", cursor: "pointer", fontFamily: "monospace" }}>
                                                                                        ✓ Use '{s}'
                                                                                    </button>
                                                                                ))}
                                                                            </div>
                                                                        </div>
                                                                    )}
                                                                    {hint.actualValues.length > 0 && (
                                                                        <div>
                                                                            <p style={{ fontSize: "10px", fontWeight: 700, color: "#6B7280", textTransform: "uppercase", letterSpacing: "0.08em", margin: "0 0 6px" }}>Actual values in <code style={{ fontFamily: "monospace", textTransform: "none" }}>{hint.column}</code></p>
                                                                            <div style={{ display: "flex", flexWrap: "wrap", gap: "5px" }}>
                                                                                {hint.actualValues.map(v => (
                                                                                    <button key={v} onClick={() => applySuggestion(hint, v)} disabled={running}
                                                                                        style={{ padding: "3px 10px", borderRadius: "20px", fontSize: "11px", background: "rgba(255,255,255,0.04)", border: "1px solid var(--border)", color: "var(--text-secondary)", cursor: "pointer", fontFamily: "monospace" }}>
                                                                                        {v}
                                                                                    </button>
                                                                                ))}
                                                                            </div>
                                                                        </div>
                                                                    )}
                                                                </div>
                                                            ))}
                                                        </div>
                                                        <p style={{ fontSize: "11px", color: "#6B7280", margin: 0, borderTop: "1px solid rgba(255,255,255,0.06)", paddingTop: "10px" }}>
                                                            💡 Click any value above to instantly retry the query with that correction.
                                                        </p>
                                                    </div>
                                                )}
                                                {!guardrail && (
                                                    <div style={{ background: "rgba(99,102,241,0.05)", border: "1px solid rgba(99,102,241,0.15)", borderRadius: "10px", padding: "12px 14px", display: "flex", alignItems: "flex-start", gap: "8px" }}>
                                                        <svg width="14" height="14" fill="none" stroke="#818cf8" strokeWidth="2" viewBox="0 0 24 24" style={{ flexShrink: 0, marginTop: "1px" }}><path strokeLinecap="round" strokeLinejoin="round" d="M11.25 11.25l.041-.02a.75.75 0 011.063.852l-.708 2.836a.75.75 0 001.063.853l.041-.021M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9-3.75h.008v.008H12V8.25z" /></svg>
                                                        <p style={{ fontSize: "12px", color: "#818cf8", margin: 0, lineHeight: 1.55 }}>The query is valid but matched no rows. Try browsing the table first to see what values exist.</p>
                                                    </div>
                                                )}
                                            </div>
                                        ) : (
                                            <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                                                {loadingExplanation ? (
                                                    <div style={{ display: "flex", alignItems: "center", gap: "8px", color: "#6366f1", fontSize: "13px" }}>
                                                        <Spinner size={14} color="#6366f1" /> Analyzing results…
                                                    </div>
                                                ) : resultExplanation ? (
                                                    <div style={{ background: "rgba(99,102,241,0.06)", border: "1px solid rgba(99,102,241,0.15)", borderRadius: "10px", padding: "14px 16px", display: "flex", alignItems: "flex-start", gap: "10px" }}>
                                                        <svg width="16" height="16" fill="none" stroke="#818cf8" strokeWidth="2" viewBox="0 0 24 24" style={{ flexShrink: 0, marginTop: "2px" }}><path strokeLinecap="round" strokeLinejoin="round" d="M13.5 10.5V6.75a4.5 4.5 0 119 0v3.75M3.75 21.75h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H3.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" /></svg>
                                                        <div>
                                                            <p style={{ fontSize: "12px", fontWeight: 700, color: "#a5b4fc", margin: "0 0 4px" }}>AI Summary</p>
                                                            <p style={{ fontSize: "13px", color: "#E5E7EB", margin: 0, lineHeight: 1.5 }}>{resultExplanation}</p>
                                                        </div>
                                                    </div>
                                                ) : null}

                                                <div style={{ display: "flex", gap: "12px", borderBottom: "1px solid var(--border)", paddingBottom: "8px" }}>
                                                    <button 
                                                        onClick={() => setActiveResultTab("data")} 
                                                        style={{ 
                                                            background: activeResultTab === "data" ? "rgba(99,102,241,0.15)" : "transparent",
                                                            border: "none",
                                                            color: activeResultTab === "data" ? "#818cf8" : "#9CA3AF",
                                                            padding: "6px 12px", borderRadius: "6px", fontSize: "12px", fontWeight: 600, cursor: "pointer", transition: "all 0.15s"
                                                        }}
                                                    >
                                                        Data Table
                                                    </button>
                                                    <button 
                                                        onClick={() => setActiveResultTab("pivot")} 
                                                        style={{ 
                                                            background: activeResultTab === "pivot" ? "rgba(99,102,241,0.15)" : "transparent",
                                                            border: "none",
                                                            color: activeResultTab === "pivot" ? "#818cf8" : "#9CA3AF",
                                                            padding: "6px 12px", borderRadius: "6px", fontSize: "12px", fontWeight: 600, cursor: "pointer", transition: "all 0.15s"
                                                        }}
                                                    >
                                                        Pivot Table
                                                    </button>
                                                </div>

                                                {activeResultTab === "data" ? (
                                                    (results && results.length > 1) ? (
                                                        <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
                                                            {results.map((res, i) => (
                                                                <div key={i} style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                                                                    <div style={{ fontSize: "12px", fontWeight: 700, color: "#818cf8", background: "rgba(99,102,241,0.1)", padding: "4px 8px", borderRadius: "4px", alignSelf: "flex-start" }}>
                                                                        Result Set {i + 1}
                                                                    </div>
                                                                    <DataTable columns={res.columns} rows={res.rows} pageSize={25} exportFilename={`${exportStem}_set${i+1}`} />
                                                                </div>
                                                            ))}
                                                        </div>
                                                    ) : (
                                                        <DataTable columns={columns} rows={rows} pageSize={25} exportFilename={exportStem} />
                                                    )
                                                ) : (
                                                    <PivotTableWrapper data={rows} />
                                                )}

                                                {/* Follow-up Questions */}
                                                {(followUpQuestions.length > 0 || loadingFollowUps) && (
                                                    <div style={{ marginTop: "10px" }}>
                                                        <p style={{ fontSize: "12px", fontWeight: 700, color: "#6B7280", margin: "0 0 8px" }}>Suggested Follow-ups</p>
                                                        <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
                                                            {loadingFollowUps ? (
                                                                <div style={{ display: "flex", alignItems: "center", gap: "8px", color: "#4B5563", fontSize: "12px" }}>
                                                                    <Spinner size={12} color="#4B5563" /> Generating suggestions…
                                                                </div>
                                                            ) : followUpQuestions.map((q, idx) => (
                                                                <button
                                                                    key={idx}
                                                                    onClick={() => {
                                                                        setPrompt(q);
                                                                        generateSQL(q);
                                                                        window.scrollTo({ top: 0, behavior: "smooth" });
                                                                    }}
                                                                    style={{
                                                                        padding: "8px 14px", borderRadius: "20px", fontSize: "12px",
                                                                        background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)",
                                                                        color: "#D1D5DB", cursor: "pointer", transition: "all 0.15s"
                                                                    }}
                                                                    onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = "rgba(255,255,255,0.1)"}
                                                                    onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = "rgba(255,255,255,0.05)"}
                                                                >
                                                                    ✨ {q}
                                                                </button>
                                                            ))}
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>

            {/* History drawer */}
            <QueryHistoryDrawer
                isOpen={historyOpen}
                onClose={() => setHistoryOpen(false)}
                onRerun={handleRerun}
            />

            {/* Explain Plan Modal */}
            {isExplainModalOpen && (
                <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000, padding: "20px" }}>
                    <div style={{ background: "#0f111a", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "12px", width: "100%", maxWidth: "800px", maxHeight: "85vh", display: "flex", flexDirection: "column", boxShadow: "0 25px 50px -12px rgba(0,0,0,0.5)" }}>
                        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "16px 20px", borderBottom: "1px solid var(--border)" }}>
                            <h3 style={{ margin: 0, fontSize: "16px", fontWeight: 700, color: "var(--text-primary)" }}>Query Execution Plan</h3>
                            <button onClick={() => setIsExplainModalOpen(false)} style={{ background: "transparent", border: "none", color: "var(--text-secondary)", cursor: "pointer", fontSize: "18px" }}>×</button>
                        </div>
                        <div style={{ padding: "20px", overflowY: "auto", display: "flex", flexDirection: "column", gap: "20px" }}>
                            {explainPlanLoading ? (
                                <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "12px", padding: "40px", color: "var(--text-secondary)", fontSize: "14px" }}>
                                    <Spinner size={24} color="#6366f1" /> Analyzing query plan…
                                </div>
                            ) : (
                                <>
                                    <div style={{ background: "rgba(99,102,241,0.06)", border: "1px solid rgba(99,102,241,0.15)", borderRadius: "10px", padding: "16px" }}>
                                        <h4 style={{ margin: "0 0 8px", fontSize: "13px", fontWeight: 700, color: "#a5b4fc" }}>AI Summary</h4>
                                        <p style={{ margin: 0, fontSize: "13px", color: "#E5E7EB", lineHeight: 1.6, whiteSpace: "pre-wrap" }}>{explainPlanSummary}</p>
                                    </div>
                                    <div>
                                        <h4 style={{ margin: "0 0 8px", fontSize: "13px", fontWeight: 700, color: "var(--text-secondary)" }}>Raw Output</h4>
                                        <pre style={{ margin: 0, padding: "16px", background: "#000", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "10px", fontSize: "12px", color: "#34d399", overflowX: "auto", fontFamily: "monospace" }}>
                                            {explainPlanData}
                                        </pre>
                                    </div>
                                </>
                            )}
                        </div>
                        <div style={{ padding: "16px 20px", borderTop: "1px solid rgba(255,255,255,0.08)", display: "flex", justifyContent: "flex-end" }}>
                            <button onClick={() => setIsExplainModalOpen(false)} style={{ padding: "8px 16px", borderRadius: "8px", background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", color: "var(--text-primary)", cursor: "pointer", fontSize: "13px", fontWeight: 600 }}>Close</button>
                        </div>
                    </div>
                </div>
            )}

            {/* Save Query Modal */}
            {isSaveModalOpen && (
                <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000, padding: "20px" }}>
                    <div style={{ background: "#0f111a", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "12px", width: "100%", maxWidth: "500px", display: "flex", flexDirection: "column", boxShadow: "0 25px 50px -12px rgba(0,0,0,0.5)" }}>
                        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "16px 20px", borderBottom: "1px solid var(--border)" }}>
                            <h3 style={{ margin: 0, fontSize: "16px", fontWeight: 700, color: "var(--text-primary)" }}>Save Query</h3>
                            <button onClick={() => setIsSaveModalOpen(false)} style={{ background: "transparent", border: "none", color: "var(--text-secondary)", cursor: "pointer", fontSize: "18px" }}>×</button>
                        </div>
                        <div style={{ padding: "20px", display: "flex", flexDirection: "column", gap: "16px" }}>
                            <div>
                                <label style={{ ...labelStyle, display: "block", marginBottom: "6px" }}>Title</label>
                                <input value={saveTitle} onChange={e => setSaveTitle(e.target.value)} placeholder="e.g. Monthly Revenue by Region" autoFocus
                                    style={{ width: "100%", background: "var(--bg-base)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "8px", padding: "10px", color: "var(--text-primary)", fontSize: "13px", outline: "none", boxSizing: "border-box" }}
                                />
                            </div>
                            <div>
                                <label style={{ ...labelStyle, display: "block", marginBottom: "6px" }}>Tags (comma separated)</label>
                                <input value={saveTags} onChange={e => setSaveTags(e.target.value)} placeholder="e.g. sales, revenue, monthly"
                                    style={{ width: "100%", background: "var(--bg-base)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "8px", padding: "10px", color: "var(--text-primary)", fontSize: "13px", outline: "none", boxSizing: "border-box" }}
                                />
                            </div>
                        </div>
                        <div style={{ padding: "16px 20px", borderTop: "1px solid rgba(255,255,255,0.08)", display: "flex", justifyContent: "flex-end", gap: "10px" }}>
                            <button onClick={() => setIsSaveModalOpen(false)} style={{ padding: "8px 16px", borderRadius: "8px", background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", color: "var(--text-primary)", cursor: "pointer", fontSize: "13px", fontWeight: 600 }}>Cancel</button>
                            <button onClick={handleSaveQuery} disabled={!saveTitle.trim() || savingQuery}
                                style={{ padding: "8px 16px", borderRadius: "8px", background: "#6366f1", border: "none", color: "var(--text-primary)", cursor: (!saveTitle.trim() || savingQuery) ? "not-allowed" : "pointer", fontSize: "13px", fontWeight: 600, display: "flex", alignItems: "center", gap: "6px" }}
                            >
                                {savingQuery ? <Spinner size={12} /> : null} Save
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <style>{`
                @keyframes spin    { to { transform: rotate(360deg); } }
                @keyframes fadeUp  { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: none; } }
            `}</style>
        </div>
    );
}
