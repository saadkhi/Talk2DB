"use client";
/**
 * PageStateContext
 *
 * Persists per-page UI state across Next.js navigation so users don't lose
 * their work when they switch sidebar tabs and come back.
 *
 * Each page slice is typed separately so TypeScript stays strict.
 * State is held in memory (not localStorage) — it survives route changes
 * within the same session but resets on full page refresh, which is fine.
 */

import React, { createContext, useContext, useState, useCallback } from "react";

// ─── Per-page state shapes ────────────────────────────────────────────────────

export interface ColInfo { name: string; type: string; nullable: boolean; isPrimary: boolean; }
export interface TableInfo { name: string; rowCount: number; columns: ColInfo[]; }

export interface ColumnHint {
    column: string; queriedValue: string;
    actualValues: string[]; suggestions: string[];
}
export interface QueryGuardrail {
    type: "no_results" | "value_mismatch" | "column_not_found";
    message: string; hints: ColumnHint[];
}

export interface QueryStudioState {
    tables: TableInfo[];
    loadingSchema: boolean;
    schemaError: string | null;
    tableSearch: string;
    selectedTable: TableInfo | null;
    prompt: string;
    generatedSql: string;
    editedSql: string;
    columns: string[];
    rows: any[];
    results?: { columns: string[], rows: any[] }[];
    hasResult: boolean;
    rowError: string | null;
    genError: string | null;
    guardrail: QueryGuardrail | null;
}

export interface VisualizerResult {
    chartType: "bar" | "line" | "pie" | "area";
    xKey: string; yKeys: string[]; title: string;
    sql: string; columns: string[]; data: any[];
}
export interface VisualizerState {
    prompt: string;
    result: VisualizerResult | null;
    error: string | null;
}

export interface SchemaExplorerState {
    tables: TableInfo[];
    selected: TableInfo | null;
    search: string;
    loaded: boolean;
    error: string | null;
}

export interface ReportData {
    sql: string; columns: string[]; rows: any[];
    chartConfig: {
        chartType: "bar" | "line" | "pie" | "area" | "scatter";
        xKey: string; yKeys: string[]; title: string;
    };
}
export interface Narrative {
    title: string; summary: string;
    insights: string[]; recommendations: string[];
}
export interface ReportBuilderState {
    prompt: string;
    reportData: ReportData | null;
    narrative: Narrative | null;
    savedId: string | null;
    error: string | null;
}

export interface TableData {
    table: string; totalRows: number; page: number; limit: number;
    totalPages: number; columns: string[]; rows: any[];
}
export interface DatabaseBrowserState {
    tables: TableInfo[];
    loaded: boolean;
    search: string;
    selectedTable: TableInfo | null;
    tableData: TableData | null;
    page: number;
    pageSize: number;
    activeTab: "data" | "structure";
    dataErr: string | null;
}

export interface ColProfile {
    name: string; type: string; nullCount: number; nullPct: number;
    distinctCount: number; anomalies: string[];
    min?: number | null; max?: number | null; avg?: number | null;
    min_date?: string; max_date?: string;
    topValues?: { value: string; count: number }[];
}
export interface TableProfile { tableName: string; totalRows: number; columns: ColProfile[]; }
export interface DataProfilerState {
    tables: string[];
    selected: string;
    loaded: boolean;
    profile: TableProfile | null;
    headerErr: string | null;
    profileErr: string | null;
}

// ─── Default values ───────────────────────────────────────────────────────────

const defaultQueryStudio: QueryStudioState = {
    tables: [], loadingSchema: true, schemaError: null,
    tableSearch: "", selectedTable: null,
    prompt: "", generatedSql: "", editedSql: "",
    columns: [], rows: [], results: [], hasResult: false,
    rowError: null, genError: null, guardrail: null,
};
const defaultVisualizer: VisualizerState = { prompt: "", result: null, error: null };
const defaultSchemaExplorer: SchemaExplorerState = {
    tables: [], selected: null, search: "", loaded: false, error: null,
};
const defaultReportBuilder: ReportBuilderState = {
    prompt: "", reportData: null, narrative: null, savedId: null, error: null,
};
const defaultDatabaseBrowser: DatabaseBrowserState = {
    tables: [], loaded: false, search: "", selectedTable: null,
    tableData: null, page: 0, pageSize: 50, activeTab: "data", dataErr: null,
};
const defaultDataProfiler: DataProfilerState = {
    tables: [], selected: "", loaded: false,
    profile: null, headerErr: null, profileErr: null,
};

// ─── Context type ─────────────────────────────────────────────────────────────

interface PageStateContextType {
    queryStudio: QueryStudioState;
    setQueryStudio: (s: Partial<QueryStudioState>) => void;

    visualizer: VisualizerState;
    setVisualizer: (s: Partial<VisualizerState>) => void;

    schemaExplorer: SchemaExplorerState;
    setSchemaExplorer: (s: Partial<SchemaExplorerState>) => void;

    reportBuilder: ReportBuilderState;
    setReportBuilder: (s: Partial<ReportBuilderState>) => void;

    databaseBrowser: DatabaseBrowserState;
    setDatabaseBrowser: (s: Partial<DatabaseBrowserState>) => void;

    dataProfiler: DataProfilerState;
    setDataProfiler: (s: Partial<DataProfilerState>) => void;

    /** Call when the session transitions (guest→auth or auth→guest) to flush
     *  any cached demo schema so the next visit fetches the real one. */
    resetSchemaCache: () => void;
}

// ─── Context + Provider ───────────────────────────────────────────────────────

const PageStateContext = createContext<PageStateContextType | undefined>(undefined);

export function PageStateProvider({ children }: { children: React.ReactNode }) {
    const [queryStudio, _setQS] = useState<QueryStudioState>(defaultQueryStudio);
    const [visualizer, _setVis] = useState<VisualizerState>(defaultVisualizer);
    const [schemaExplorer, _setSE] = useState<SchemaExplorerState>(defaultSchemaExplorer);
    const [reportBuilder, _setRB] = useState<ReportBuilderState>(defaultReportBuilder);
    const [databaseBrowser, _setDB] = useState<DatabaseBrowserState>(defaultDatabaseBrowser);
    const [dataProfiler, _setDP] = useState<DataProfilerState>(defaultDataProfiler);

    // Merge-update helpers — callers pass only the keys they want to change
    const setQueryStudio   = useCallback((s: Partial<QueryStudioState>)   => _setQS(p  => ({ ...p,  ...s })), []);
    const setVisualizer    = useCallback((s: Partial<VisualizerState>)    => _setVis(p => ({ ...p,  ...s })), []);
    const setSchemaExplorer= useCallback((s: Partial<SchemaExplorerState>)=> _setSE(p  => ({ ...p,  ...s })), []);
    const setReportBuilder = useCallback((s: Partial<ReportBuilderState>) => _setRB(p  => ({ ...p,  ...s })), []);
    const setDatabaseBrowser=useCallback((s: Partial<DatabaseBrowserState>)=>_setDB(p  => ({ ...p,  ...s })), []);
    const setDataProfiler  = useCallback((s: Partial<DataProfilerState>)  => _setDP(p  => ({ ...p,  ...s })), []);

    /**
     * Flush all schema caches so the next tool visit re-fetches from the
     * correct endpoint (real DB for auth users, demo for guests).
     * Call this when the session transitions between guest ↔ authenticated.
     */
    const resetSchemaCache = useCallback(() => {
        _setQS(p  => ({ ...p,  tables: [], loadingSchema: true, schemaError: null,
                                selectedTable: null, columns: [], rows: [], results: [], hasResult: false,
                                rowError: null, genError: null, guardrail: null }));
        _setSE(p  => ({ ...p,  tables: [], loaded: false, selected: null, error: null }));
        _setDB(p  => ({ ...p,  tables: [], loaded: false, selectedTable: null, tableData: null,
                                page: 0, dataErr: null }));
        _setDP(p  => ({ ...p,  tables: [], loaded: false, profile: null, headerErr: null, profileErr: null }));
    }, []);

    return (
        <PageStateContext.Provider value={{
            queryStudio, setQueryStudio,
            visualizer, setVisualizer,
            schemaExplorer, setSchemaExplorer,
            reportBuilder, setReportBuilder,
            databaseBrowser, setDatabaseBrowser,
            dataProfiler, setDataProfiler,
            resetSchemaCache,
        }}>
            {children}
        </PageStateContext.Provider>
    );
}

export function usePageState() {
    const ctx = useContext(PageStateContext);
    if (!ctx) throw new Error("usePageState must be used within a PageStateProvider");
    return ctx;
}
