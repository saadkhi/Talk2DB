"use client";
/**
 * GuestContext
 *
 * Tracks per-tool trial counts for unauthenticated users.
 * Counts are persisted in localStorage under "guest_trials".
 *
 * Each tool key maps to an integer usage count.
 * MAX_TRIALS_PER_TOOL = 2 — after that, useGuest().isLimitReached(tool) → true.
 *
 * Tool keys:  "query" | "visualizer" | "report" | "schema" | "profiler" | "browser"
 */

import React, {
    createContext, useContext, useState, useEffect, useCallback,
} from "react";

export type GuestTool =
    | "query"
    | "visualizer"
    | "report"
    | "schema"
    | "profiler"
    | "browser";

export const MAX_TRIALS = 2;
const STORAGE_KEY = "guest_trials_v2";

type TrialMap = Record<GuestTool, number>;

const defaultTrials: TrialMap = {
    query: 0, visualizer: 0, report: 0,
    schema: 0, profiler: 0, browser: 0,
};

interface GuestContextType {
    trials: TrialMap;
    /** Returns true if the user has used up their free tries for this tool */
    isLimitReached: (tool: GuestTool) => boolean;
    /** Increments the trial count. Returns true if the limit was JUST hit, false if still under. */
    consumeTrial: (tool: GuestTool) => boolean;
    /** Resets all counts (for testing / after sign-in) */
    resetTrials: () => void;
    /** Which tool triggered the current limit modal (null = modal closed) */
    blockedTool: GuestTool | null;
    setBlockedTool: (t: GuestTool | null) => void;
}

const GuestContext = createContext<GuestContextType | undefined>(undefined);

function loadTrials(): TrialMap {
    if (typeof window === "undefined") return { ...defaultTrials };
    try {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (!raw) return { ...defaultTrials };
        return { ...defaultTrials, ...JSON.parse(raw) };
    } catch {
        return { ...defaultTrials };
    }
}

function saveTrials(t: TrialMap) {
    if (typeof window === "undefined") return;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(t));
}

export function GuestProvider({ children }: { children: React.ReactNode }) {
    const [trials, setTrials] = useState<TrialMap>(defaultTrials);
    const [blockedTool, setBlockedTool] = useState<GuestTool | null>(null);

    // Hydrate from localStorage after mount (avoid SSR mismatch)
    useEffect(() => { setTrials(loadTrials()); }, []);

    const isLimitReached = useCallback(
        (tool: GuestTool) => trials[tool] >= MAX_TRIALS,
        [trials]
    );

    const consumeTrial = useCallback((tool: GuestTool): boolean => {
        setTrials(prev => {
            const next = { ...prev, [tool]: prev[tool] + 1 };
            saveTrials(next);
            return next;
        });
        // Return true (blocked) if already at limit BEFORE this consumption
        const current = loadTrials()[tool];
        if (current >= MAX_TRIALS) {
            setBlockedTool(tool);
            return true;
        }
        const after = current + 1;
        if (after >= MAX_TRIALS) {
            // They used the last free trial — show warning on next attempt
        }
        return false;
    }, []);

    const resetTrials = useCallback(() => {
        const fresh = { ...defaultTrials };
        setTrials(fresh);
        saveTrials(fresh);
    }, []);

    return (
        <GuestContext.Provider value={{
            trials, isLimitReached, consumeTrial,
            resetTrials, blockedTool, setBlockedTool,
        }}>
            {children}
        </GuestContext.Provider>
    );
}

export function useGuest() {
    const ctx = useContext(GuestContext);
    if (!ctx) throw new Error("useGuest must be used inside GuestProvider");
    return ctx;
}
