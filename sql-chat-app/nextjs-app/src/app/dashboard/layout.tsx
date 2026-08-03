import { DatabaseProvider } from "@/context/DatabaseContext";
import { PageStateProvider } from "@/context/PageStateContext";
import DashboardShell from "@/components/layout/DashboardShell";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
    return (
        <DatabaseProvider>
            <PageStateProvider>
                <DashboardShell>{children}</DashboardShell>
            </PageStateProvider>
        </DatabaseProvider>
    );
}
