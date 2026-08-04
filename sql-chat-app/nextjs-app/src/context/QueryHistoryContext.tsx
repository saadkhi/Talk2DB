"use client";
/**
 * QueryHistoryContext
 *
 * Tracks every SQL execution that happens in Query Studio (both AI-generated
 * and manual runs).  State lives in memory — survives SPA navigation but
 * resets on full page refresh, which is intentional (no auth concerns).
 *
 * Each entry stores:
 *  - id            unique id (monotonic counter)
 *  - prompt        the NL prompt that triggered generation (empty for manual runs)
 *  - sql           the exact SQL that was executed
 *  - columns       column names returned
 *  - rows          result rows
 *  - rowCount      rows.length (kept separately so entries can be pruned cheaply)
 *  - execTimeMs    wall-clock execution time in milliseconds
 *  - status        "success" | "error"
 *  - errorMessage  error text when status === "error"
 *  - ranAt         Date the query was run
 */

import React, { createContext, useContext, useCallback, useRef, useState } from "react";

export interface HistoryEntry {
    id: number;
    prompt: string;
    sql: string;
    columns: string[];
    rows: any[];
    rowCount: number;
    execTimeMs: number;
    status: "success" | "error";
    errorMessage?: string;
    ranAt: Date;
}

interface QueryHistoryContextType {
    entries: HistoryEntry[];
    /** Push a new entry — called by Query Studio after every run */
    addEntry: (entry: Omit<HistoryEntry, "id">) => void;
    /** Remove one entry by id */
    removeEntry: (id: number) => void;
    /** Wipe everything */
    clearHistory: () => void;
}

const QueryHistoryContext = createContext<QueryHistoryContextType | undefined>(undefined);

/** Maximum entries to keep in memory (oldest are dropped) */
const MAX_ENTRIES = 200;

export function QueryHistoryProvider({ children }: { children: React.ReactNode }) {
    const [entries, setEntries] = useState<HistoryEntry[]>([]);
    const counter = useRef(0);

    const addEntry = useCallback((entry: Omit<HistoryEntry, "id">) => {
        counter.current += 1;
        const id = counter.current;
        setEntries(prev => {
            const next = [{ ...entry, id }, ...prev];
            return next.length > MAX_ENTRIES ? next.slice(0, MAX_ENTRIES) : next;
        });
    }, []);

    const removeEntry = useCallback((id: number) => {
        setEntries(prev => prev.filter(e => e.id !== id));
    }, []);

    const clearHistory = useCallback(() => setEntries([]), []);

    return (
        <QueryHistoryContext.Provider value={{ entries, addEntry, removeEntry, clearHistory }}>
            {children}
        </QueryHistoryContext.Provider>
    );
}

export function useQueryHistory() {
    const ctx = useContext(QueryHistoryContext);
    if (!ctx) throw new Error("useQueryHistory must be used within a QueryHistoryProvider");
    return ctx;
}
