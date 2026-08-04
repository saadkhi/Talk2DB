"use client";
/**
 * useGuestGuard
 *
 * Drop this into any tool page.  Call `guardedSubmit(fn)` instead of calling
 * your async handler directly.  For unauthenticated users it:
 *   1. Checks if the trial limit is already reached → opens modal immediately.
 *   2. Otherwise consumes a trial, then calls your handler.
 *
 * Returns helpers:
 *   isGuest       – true when unauthenticated
 *   trialsUsed    – number of trials consumed so far for this tool
 *   trialsLeft    – remaining free tries
 *   guardedSubmit – wraps a submit handler with the trial gate
 */

import { useSession } from "next-auth/react";
import { useGuest, GuestTool, MAX_TRIALS } from "@/context/GuestContext";

export function useGuestGuard(tool: GuestTool) {
    const { status } = useSession();
    const { trials, isLimitReached, consumeTrial, setBlockedTool } = useGuest();

    const isGuest   = status !== "authenticated";
    const trialsUsed = trials[tool] ?? 0;
    const trialsLeft = Math.max(0, MAX_TRIALS - trialsUsed);

    /**
     * Call this instead of your submit handler directly.
     * @param fn  The async action to perform if the user has tries left.
     * @returns   true if the action was blocked, false if it ran.
     */
    async function guardedSubmit(fn: () => Promise<void> | void): Promise<boolean> {
        if (!isGuest) {
            await fn();
            return false;
        }

        if (isLimitReached(tool)) {
            setBlockedTool(tool);
            return true; // blocked
        }

        const blocked = consumeTrial(tool);
        if (blocked) {
            // consumeTrial already called setBlockedTool
            return true;
        }

        await fn();
        return false;
    }

    return { isGuest, trialsUsed, trialsLeft, guardedSubmit };
}
