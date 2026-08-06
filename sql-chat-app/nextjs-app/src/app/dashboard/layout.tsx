"use client";
import React, { useEffect, useRef } from "react";
import { useSession } from "next-auth/react";
import { DatabaseProvider } from "@/context/DatabaseContext";
import { PageStateProvider, usePageState } from "@/context/PageStateContext";
import DashboardShell from "@/components/layout/DashboardShell";

/**
 * Inner wrapper — can use usePageState because it's rendered inside
 * PageStateProvider. Watches the session status and flushes cached demo
 * schema whenever the user transitions from guest → authenticated (or back).
 */
function SchemaCacheWatcher({ children }: { children: React.ReactNode }) {
    const { status } = useSession();
    const { resetSchemaCache } = usePageState();
    const prevStatus = useRef<string | null>(null);

    useEffect(() => {
        if (prevStatus.current === null) {
            // First render — just record the initial status, don't reset yet
            prevStatus.current = status;
            return;
        }
        if (prevStatus.current !== status) {
            // Status changed (loading→authenticated, authenticated→unauthenticated, etc.)
            // Flush cached schema so pages re-fetch from the right endpoint
            resetSchemaCache();
            prevStatus.current = status;
        }
    }, [status, resetSchemaCache]);

    return <>{children}</>;
}

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
    return (
        <DatabaseProvider>
            <PageStateProvider>
                <SchemaCacheWatcher>
                    <DashboardShell>{children}</DashboardShell>
                </SchemaCacheWatcher>
            </PageStateProvider>
        </DatabaseProvider>
    );
}
