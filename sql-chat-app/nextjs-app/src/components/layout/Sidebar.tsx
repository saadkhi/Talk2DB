"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession, signOut } from "next-auth/react";

interface SidebarProps {
    isCollapsed: boolean;
    isMobileOpen: boolean;
    onCloseMobile: () => void;
    onToggleCollapse: () => void;
}

const MAIN_ITEMS = [
    {
        href: "/dashboard",
        label: "Home",
        icon: (
            <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12l8.954-8.955c.44-.439 1.152-.439 1.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21h8.25" />
            </svg>
        ),
    },
    {
        href: "/dashboard/query-studio",
        label: "Query Studio",
        icon: (
            <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M17.25 6.75L22.5 12l-5.25 5.25m-10.5 0L1.5 12l5.25-5.25m7.5-3l-4.5 16.5" />
            </svg>
        ),
    },
    {
        href: "/dashboard/data-visualizer",
        label: "Data Visualizer",
        icon: (
            <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M7.5 14.25v2.25m3-4.5v4.5m3-6.75v6.75m3-9v9M6 20.25h12A2.25 2.25 0 0020.25 18V6A2.25 2.25 0 0018 3.75H6A2.25 2.25 0 003.75 6v12A2.25 2.25 0 006 20.25z" />
            </svg>
        ),
    },
    {
        href: "/dashboard/schema-explorer",
        label: "Schema Explorer",
        icon: (
            <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6A2.25 2.25 0 016 3.75h2.25A2.25 2.25 0 0110.5 6v2.25a2.25 2.25 0 01-2.25 2.25H6a2.25 2.25 0 01-2.25-2.25V6zM3.75 15.75A2.25 2.25 0 016 13.5h2.25a2.25 2.25 0 012.25 2.25V18a2.25 2.25 0 01-2.25 2.25H6A2.25 2.25 0 013.75 18v-2.25zM13.5 6a2.25 2.25 0 012.25-2.25H18A2.25 2.25 0 0120.25 6v2.25A2.25 2.25 0 0118 10.5h-2.25a2.25 2.25 0 01-2.25-2.25V6zM13.5 15.75a2.25 2.25 0 012.25-2.25H18a2.25 2.25 0 012.25 2.25V18A2.25 2.25 0 0118 20.25h-2.25A2.25 2.25 0 0113.5 18v-2.25z" />
            </svg>
        ),
    },
    {
        href: "/dashboard/report-builder",
        label: "Report Builder",
        icon: (
            <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
            </svg>
        ),
    },
    {
        href: "/dashboard/data-profiler",
        label: "Data Profiler",
        icon: (
            <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h3.75M9 15h3.75m-7.5 6H18a2.25 2.25 0 002.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 00-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 00.75-.75 2.25 2.25 0 00-.1-.664m-5.8 0A2.251 2.251 0 0113.5 2.25H15c1.012 0 1.867.668 2.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25zM6.75 12h.008v.008H6.75V12zm0 3h.008v.008H6.75V15zm0 3h.008v.008H6.75V18z" />
            </svg>
        ),
    },
];

const SECONDARY_ITEMS = [
    {
        href: "/dashboard/history",
        label: "History",
        icon: (
            <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
        ),
    },
    {
        href: "/dashboard/saved-queries",
        label: "Saved Queries",
        icon: (
            <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M17.593 3.322c1.1.128 1.907 1.077 1.907 2.185V21L12 17.25 4.5 21V5.507c0-1.108.806-2.057 1.907-2.185a48.507 48.507 0 0111.186 0z" />
            </svg>
        ),
    },
    {
        href: "/dashboard/settings",
        label: "Settings",
        icon: (
            <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.324.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 011.37.49l1.296 2.247a1.125 1.125 0 01-.26 1.431l-1.003.827c-.293.24-.438.613-.431.992a6.759 6.759 0 010 .255c-.007.378.138.75.43.99l1.005.828c.424.35.534.954.26 1.43l-1.298 2.247a1.125 1.125 0 01-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.57 6.57 0 01-.22.128c-.331.183-.581.495-.644.869l-.213 1.28c-.09.543-.56.941-1.11.941h-2.594c-.55 0-1.02-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 01-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 01-1.369-.49l-1.297-2.247a1.125 1.125 0 01.26-1.431l1.004-.827c.292-.24.437-.613.43-.992a6.932 6.932 0 010-.255c.007-.378-.138-.75-.43-.99l-1.004-.828a1.125 1.125 0 01-.26-1.43l1.297-2.247a1.125 1.125 0 011.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.087.22-.128.332-.183.582-.495.644-.869l.214-1.281z" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
        ),
    },
    {
        href: "/dashboard/help",
        label: "Help & Docs",
        icon: (
            <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9.879 7.519c1.171-1.025 3.071-1.025 4.242 0 1.172 1.025 1.172 2.687 0 3.712-.203.179-.43.326-.67.442-.745.361-1.45.999-1.45 1.827v.75M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9 5.25h.008v.008H12v-.008z" />
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
    const { data: session } = useSession();

    const userName = session?.user?.name || session?.user?.email?.split("@")[0] || "User";
    const userEmail = session?.user?.email || "";
    const initials = userName.slice(0, 2).toUpperCase();

    const NavItem = ({ href, label, icon }: { href: string; label: string; icon: React.ReactNode }) => {
        const isActive = pathname === href;
        return (
            <Link
                href={href}
                onClick={onCloseMobile}
                title={isCollapsed ? label : undefined}
                className={`flex items-center gap-2.5 px-3 py-2 rounded-lg text-[13px] font-medium transition-all duration-150 group ${
                    isActive
                        ? "bg-[#6366f1] text-white"
                        : "text-[#9CA3AF] hover:bg-white/5 hover:text-white"
                } ${isCollapsed ? "justify-center px-2" : ""}`}
            >
                <span className={`shrink-0 ${isActive ? "text-white" : "text-[#6B7280] group-hover:text-white"}`}>
                    {icon}
                </span>
                {!isCollapsed && <span className="truncate">{label}</span>}
            </Link>
        );
    };

    const SidebarContent = (
        <div className="flex flex-col h-full bg-[#0d0f1a] border-r border-white/[0.06] select-none overflow-hidden">
            {/* Brand header */}
            <div className={`flex items-center justify-between px-4 h-14 border-b border-white/[0.06] shrink-0 ${isCollapsed ? "px-2 justify-center" : ""}`}>
                {!isCollapsed && (
                    <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-lg bg-[#6366f1] flex items-center justify-center shrink-0">
                            <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M20.25 6.375c0 2.278-3.694 4.125-8.25 4.125S3.75 8.653 3.75 6.375m16.5 0c0-2.278-3.694-4.125-8.25-4.125S3.75 4.097 3.75 6.375m16.5 0v11.25c0 2.278-3.694 4.125-8.25 4.125s-8.25-1.847-8.25-4.125V6.375m16.5 2.625c0 2.278-3.694 4.125-8.25 4.125s-8.25-1.847-8.25-4.125" />
                            </svg>
                        </div>
                        <span className="text-[15px] font-bold text-white tracking-tight">Talk2DB</span>
                    </div>
                )}
                {isCollapsed && (
                    <div className="w-7 h-7 rounded-lg bg-[#6366f1] flex items-center justify-center">
                        <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M20.25 6.375c0 2.278-3.694 4.125-8.25 4.125S3.75 8.653 3.75 6.375m16.5 0c0-2.278-3.694-4.125-8.25-4.125S3.75 4.097 3.75 6.375m16.5 0v11.25c0 2.278-3.694 4.125-8.25 4.125s-8.25-1.847-8.25-4.125V6.375m16.5 2.625c0 2.278-3.694 4.125-8.25 4.125s-8.25-1.847-8.25-4.125" />
                        </svg>
                    </div>
                )}
                {!isCollapsed && (
                    <button
                        onClick={onToggleCollapse}
                        className="hidden md:flex p-1 rounded-md text-[#4B5563] hover:text-white hover:bg-white/5 transition-all"
                    >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M18.75 19.5l-7.5-7.5 7.5-7.5m-6 15L5.25 12l7.5-7.5" />
                        </svg>
                    </button>
                )}
            </div>

            {/* Main nav */}
            <nav className="flex-1 px-2 pt-3 pb-2 space-y-0.5 overflow-y-auto">
                {MAIN_ITEMS.map((item) => (
                    <NavItem key={item.href} {...item} />
                ))}

                {/* Divider */}
                {!isCollapsed && <div className="my-3 border-t border-white/[0.06]" />}
                {isCollapsed && <div className="my-2" />}

                {SECONDARY_ITEMS.map((item) => (
                    <NavItem key={item.href} {...item} />
                ))}
            </nav>

            {/* Pro Tip box */}
            {!isCollapsed && (
                <div className="mx-2 mb-3 p-3 rounded-xl bg-[#6366f1]/10 border border-[#6366f1]/20">
                    <div className="flex items-center gap-1.5 mb-1.5">
                        <svg className="w-3.5 h-3.5 text-[#6366f1]" fill="currentColor" viewBox="0 0 24 24">
                            <path d="M11.48 3.499a.562.562 0 011.04 0l2.125 5.111a.563.563 0 00.475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 00-.182.557l1.285 5.385a.562.562 0 01-.84.61l-4.725-2.885a.563.563 0 00-.586 0L6.982 20.54a.562.562 0 01-.84-.61l1.285-5.386a.562.562 0 00-.182-.557l-4.204-3.602a.563.563 0 01.321-.988l5.518-.442a.563.563 0 00.475-.345L11.48 3.5z" />
                        </svg>
                        <span className="text-[11px] font-bold text-[#6366f1] uppercase tracking-wide">Pro Tip</span>
                    </div>
                    <p className="text-[11px] text-[#9CA3AF] leading-relaxed">
                        Ask complex questions in plain English. Talk2DB will generate the SQL for you.
                    </p>
                </div>
            )}

            {/* User footer */}
            <div className={`px-2 pb-3 border-t border-white/[0.06] pt-3 shrink-0 ${isCollapsed ? "flex justify-center" : ""}`}>
                {!isCollapsed ? (
                    <div className="flex items-center justify-between gap-2 px-2 py-2 rounded-lg hover:bg-white/5 transition-all group cursor-pointer">
                        <div className="flex items-center gap-2.5 min-w-0">
                            <div className="w-7 h-7 rounded-full bg-gradient-to-br from-[#6366f1] to-[#8b5cf6] flex items-center justify-center text-white text-[11px] font-bold shrink-0">
                                {initials}
                            </div>
                            <div className="min-w-0">
                                <p className="text-[12px] font-semibold text-white truncate">{userName}</p>
                                <p className="text-[10px] text-[#6B7280] truncate">{userEmail}</p>
                            </div>
                        </div>
                        <button
                            onClick={() => signOut({ callbackUrl: "/auth/login" })}
                            title="Sign out"
                            className="shrink-0 text-[#4B5563] hover:text-red-400 transition-colors p-1 opacity-0 group-hover:opacity-100"
                        >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15M12 9l-3 3m0 0l3 3m-3-3h12.75" />
                            </svg>
                        </button>
                    </div>
                ) : (
                    <div className="w-7 h-7 rounded-full bg-gradient-to-br from-[#6366f1] to-[#8b5cf6] flex items-center justify-center text-white text-[11px] font-bold cursor-pointer" title={userName}>
                        {initials}
                    </div>
                )}
            </div>
        </div>
    );

    return (
        <>
            {isMobileOpen && (
                <div
                    className="fixed inset-0 z-40 bg-black/60 md:hidden backdrop-blur-sm"
                    onClick={onCloseMobile}
                />
            )}
            <aside className={`fixed inset-y-0 left-0 z-50 w-64 md:hidden transition-transform duration-300 ${isMobileOpen ? "translate-x-0" : "-translate-x-full"}`}>
                {SidebarContent}
            </aside>
            <aside className={`hidden md:block fixed inset-y-0 left-0 z-30 transition-all duration-300 ${isCollapsed ? "w-16" : "w-60"}`}>
                {SidebarContent}
            </aside>
        </>
    );
}
