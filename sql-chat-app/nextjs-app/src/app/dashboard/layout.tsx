"use client";
import React, { useEffect, useRef } from "react";
import { useSession } from "next-auth/react";
import { DatabaseProvider } from "@/context/DatabaseContext";
import { PageStateProvider, usePageState } from "@/context/PageStateContext";
import { QueryHistoryProvider } from "@/context/QueryHistoryContext";
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
            prevStatus.current = status;
            return;
        }
        if (prevStatus.current !== status) {
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
                <QueryHistoryProvider>
                    <SchemaCacheWatcher>
                        <DashboardShell>{children}</DashboardShell>
                    </SchemaCacheWatcher>
                </QueryHistoryProvider>
            </PageStateProvider>
        </DatabaseProvider>
    );
}
