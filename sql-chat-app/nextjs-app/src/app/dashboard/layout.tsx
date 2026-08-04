import { DatabaseProvider } from "@/context/DatabaseContext";
import { PageStateProvider } from "@/context/PageStateContext";
import { QueryHistoryProvider } from "@/context/QueryHistoryContext";
import DashboardShell from "@/components/layout/DashboardShell";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
    return (
        <DatabaseProvider>
            <PageStateProvider>
                <QueryHistoryProvider>
                    <DashboardShell>{children}</DashboardShell>
                </QueryHistoryProvider>
            </PageStateProvider>
        </DatabaseProvider>
    );
}
