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
 *   isGuest       – true when unauthenticated (NOTE: false during "loading" so
 *                   callers don't accidentally fetch guest data while session resolves)
 *   sessionReady  – true once the session status is no longer "loading"
 *   trialsUsed    – number of trials consumed so far for this tool
 *   trialsLeft    – remaining free tries
 *   guardedSubmit – wraps a submit handler with the trial gate
 */

import { useSession } from "next-auth/react";
import { useGuest, GuestTool, MAX_TRIALS } from "@/context/GuestContext";

export function useGuestGuard(tool: GuestTool) {
    const { status } = useSession();
    const { trials, isLimitReached, consumeTrial, setBlockedTool } = useGuest();

    // Session is still resolving — treat as authenticated so we don't
    // accidentally pull demo data that then gets cached in PageStateContext
    const sessionReady = status !== "loading";
    const isGuest      = sessionReady && status !== "authenticated";

    const trialsUsed = trials[tool] ?? 0;
    const trialsLeft = Math.max(0, MAX_TRIALS - trialsUsed);

    async function guardedSubmit(fn: () => Promise<void> | void): Promise<boolean> {
        if (!isGuest) {
            await fn();
            return false;
        }

        if (isLimitReached(tool)) {
            setBlockedTool(tool);
            return true;
        }

        const blocked = consumeTrial(tool);
        if (blocked) {
            return true;
        }

        await fn();
        return false;
    }

    return { isGuest, sessionReady, trialsUsed, trialsLeft, guardedSubmit };
}
