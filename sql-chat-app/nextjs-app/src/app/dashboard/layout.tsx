import { DatabaseProvider } from "@/context/DatabaseContext";
import DashboardShell from "@/components/layout/DashboardShell";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
    return (
        <DatabaseProvider>
            <DashboardShell>{children}</DashboardShell>
        </DatabaseProvider>
    );
}
