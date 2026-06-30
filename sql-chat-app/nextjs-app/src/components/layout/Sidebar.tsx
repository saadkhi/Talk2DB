"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

interface SidebarProps {
    isCollapsed: boolean;
    isMobileOpen: boolean;
    onCloseMobile: () => void;
    onToggleCollapse: () => void;
}

const MENU_ITEMS = [
    {
        href: "/dashboard",
        label: "Dashboard",
        icon: (
            <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12l8.954-8.955c.44-.439 1.152-.439 1.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21h8.25" />
            </svg>
        ),
    },
    {
        href: "/dashboard/query-studio",
        label: "Query Studio",
        icon: (
            <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M17.25 6.75L22.5 12l-5.25 5.25m-10.5 0L1.5 12l5.25-5.25m7.5-3l-4.5 16.5" />
            </svg>
        ),
    },
    {
        href: "/dashboard/data-visualizer",
        label: "Data Visualizer",
        icon: (
            <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M7.5 14.25v2.25m3-4.5v4.5m3-6.75v6.75m3-9v9M6 20.25h12A2.25 2.25 0 0020.25 18V6A2.25 2.25 0 0018 3.75H6A2.25 2.25 0 003.75 6v12A2.25 2.25 0 006 20.25z" />
            </svg>
        ),
    },
    {
        href: "/dashboard/schema-explorer",
        label: "Schema Explorer",
        icon: (
            <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6A2.25 2.25 0 016 3.75h2.25A2.25 2.25 0 0110.5 6v2.25a2.25 2.25 0 01-2.25 2.25H6a2.25 2.25 0 01-2.25-2.25V6zM3.75 15.75A2.25 2.25 0 016 13.5h2.25a2.25 2.25 0 012.25 2.25V18a2.25 2.25 0 01-2.25 2.25H6A2.25 2.25 0 013.75 18v-2.25zM13.5 6a2.25 2.25 0 012.25-2.25H18A2.25 2.25 0 0120.25 6v2.25A2.25 2.25 0 0118 10.5h-2.25a2.25 2.25 0 01-2.25-2.25V6zM13.5 15.75a2.25 2.25 0 012.25-2.25H18a2.25 2.25 0 012.25 2.25V18A2.25 2.25 0 0118 20.25h-2.25A2.25 2.25 0 0113.5 18v-2.25z" />
            </svg>
        ),
    },
    {
        href: "/dashboard/report-builder",
        label: "Report Builder",
        icon: (
            <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
            </svg>
        ),
    },
    {
        href: "/dashboard/data-profiler",
        label: "Data Profiler",
        icon: (
            <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9.75 9.75l4.5 4.5m0-4.5l-4.5 4.5M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
        ),
    },
];

export default function Sidebar({
    isCollapsed,
    isMobileOpen,
    onCloseMobile,
    onToggleCollapse,
}: SidebarProps) {
    const pathname = usePathname();

    const SidebarContent = (
        <div className="flex flex-col h-full bg-[var(--bg-surface)] border-r border-[var(--border)] py-6 text-white select-none">
            {/* Header / Brand */}
            <div className={`px-6 mb-8 flex items-center justify-between ${isCollapsed ? "justify-center px-2" : ""}`}>
                {!isCollapsed && (
                    <span className="text-xl font-bold tracking-tight text-white flex items-center gap-1.5">
                        Talk<span className="text-[var(--accent)]">2</span>DB
                    </span>
                )}
                {isCollapsed && (
                    <div className="w-9 h-9 rounded-xl bg-[var(--accent-dim)] border border-[var(--accent)]/30 flex items-center justify-center font-bold text-[var(--accent)] text-sm">
                        T2
                    </div>
                )}

                {/* Desktop Collapse Trigger */}
                <button
                    onClick={onToggleCollapse}
                    className="hidden md:flex opacity-60 hover:opacity-100 p-1.5 rounded-lg hover:bg-[var(--accent-dim)] transition-all text-gray-400 hover:text-white"
                    title={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
                >
                    <svg
                        className={`w-4 h-4 transition-transform duration-300 ${isCollapsed ? "rotate-180" : ""}`}
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2.5"
                        viewBox="0 0 24 24"
                    >
                        <path strokeLinecap="round" strokeLinejoin="round" d="M18.75 19.5l-7.5-7.5 7.5-7.5m-6 15L5.25 12l7.5-7.5" />
                    </svg>
                </button>
            </div>

            {/* Menu Items */}
            <nav className="flex-1 px-4 space-y-1.5 overflow-y-auto">
                {MENU_ITEMS.map((item) => {
                    const isActive = pathname === item.href;
                    return (
                        <Link
                            key={item.href}
                            href={item.href}
                            onClick={onCloseMobile}
                            className={`flex items-center gap-3 px-3.5 py-3 rounded-xl text-xs font-semibold transition-all duration-300 group leading-none ${isActive
                                ? "bg-[var(--accent)] text-white shadow-md shadow-[var(--accent)]/15"
                                : "text-[#9CA3AF] hover:bg-[var(--accent-dim)] hover:text-white"
                                } ${isCollapsed ? "justify-center px-1" : ""}`}
                            title={isCollapsed ? item.label : ""}
                        >
                            <span className={`transition-colors duration-300 ${isActive ? "text-white" : "text-[#9CA3AF] group-hover:text-white"}`}>
                                {item.icon}
                            </span>
                            {!isCollapsed && (
                                <span className="truncate">{item.label}</span>
                            )}
                        </Link>
                    );
                })}
            </nav>

            {/* Footer with version */}
            <div className={`px-6 pt-4 border-t border-[var(--border)]/40 text-center ${isCollapsed ? "px-2" : ""}`}>
                {!isCollapsed ? (
                    <span className="text-[10px] text-gray-500 font-bold uppercase tracking-widest block">
                        Talk2DB v2.0
                    </span>
                ) : (
                    <span className="text-[9px] text-gray-500 font-bold">
                        v2
                    </span>
                )}
            </div>
        </div>
    );

    return (
        <>
            {/* Mobile Drawer Backdrop Overlay */}
            {isMobileOpen && (
                <div
                    className="fixed inset-0 z-40 bg-black/60 md:hidden backdrop-blur-sm transition-opacity duration-300"
                    onClick={onCloseMobile}
                />
            )}

            {/* Mobile Drawer (Flyout) Container */}
            <aside
                className={`fixed inset-y-0 left-0 z-50 w-64 md:hidden transition-transform duration-300 ease-in-out ${isMobileOpen ? "translate-x-0" : "-translate-x-full"
                    }`}
            >
                {SidebarContent}
            </aside>

            {/* Desktop Fixed Sidebar */}
            <aside
                className={`hidden md:block fixed inset-y-0 left-0 z-30 transition-all duration-300 ease-in-out ${isCollapsed ? "w-20" : "w-64"
                    }`}
            >
                {SidebarContent}
            </aside>
        </>
    );
}
