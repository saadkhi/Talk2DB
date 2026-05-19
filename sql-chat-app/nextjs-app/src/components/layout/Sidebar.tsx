"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";

const tools = [
    { href: "/dashboard", label: "Dashboard", icon: "⊞" },
    { href: "/dashboard/query-studio", label: "Query Studio", icon: "🔍" },
    { href: "/dashboard/data-visualizer", label: "Data Visualizer", icon: "📊" },
    { href: "/dashboard/schema-explorer", label: "Schema Explorer", icon: "🗂️" },
    { href: "/dashboard/report-builder", label: "Report Builder", icon: "📋" },
    { href: "/dashboard/data-profiler", label: "Data Profiler", icon: "🧪" },
];

export default function Sidebar() {
    const pathname = usePathname();
    return (
        <aside className="w-60 h-screen bg-[#1a1d2e] border-r border-[#2d3154] flex flex-col fixed left-0 top-0 z-40">
            <div className="p-6 border-b border-[#2d3154] flex items-center justify-between">
                <span className="text-xl font-bold text-white">
                    Talk<span className="text-indigo-400">2</span>DB
                </span>
            </div>
            <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
                {tools.map((tool) => (
                    <Link
                        key={tool.href}
                        href={tool.href}
                        className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm transition-all ${pathname === tool.href
                                ? "bg-indigo-600 text-white"
                                : "text-gray-400 hover:bg-[#242840] hover:text-white"
                            }`}
                    >
                        <span className="text-lg">{tool.icon}</span>
                        <span className="font-medium">{tool.label}</span>
                    </Link>
                ))}
            </nav>
        </aside>
    );
}
