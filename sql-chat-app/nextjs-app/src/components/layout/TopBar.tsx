"use client";

import React from "react";
import { signOut, useSession } from "next-auth/react";
import { useDatabase } from "@/context/DatabaseContext";

interface TopBarProps {
    isCollapsed: boolean;
    onToggleCollapse: () => void;
    onOpenMobile: () => void;
    isMobile: boolean;
}

export default function TopBar({
    isCollapsed,
    onToggleCollapse,
    onOpenMobile,
    isMobile,
}: TopBarProps) {
    const { data: session } = useSession();
    const { dbConnected, loading, setShowConnectModal } = useDatabase();

    return (
        <header className="sticky top-0 z-20 flex items-center justify-between h-16 px-6 bg-[#0F1117]/90 border-b border-[#2C3142]/60 backdrop-blur-md select-none">
            {/* Left side: Hamburger menu (mobile) or Logo/Title */}
            <div className="flex items-center gap-3">
                {isMobile && (
                    <button
                        onClick={onOpenMobile}
                        className="p-1.5 rounded-lg hover:bg-[#232736]/60 text-gray-400 hover:text-white transition-all"
                        aria-label="Open sidebar menu"
                    >
                        <svg className="w-5.5 h-5.5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />
                        </svg>
                    </button>
                )}

                {/* Logo/Wordmark */}
                <div className="flex items-center gap-2">
                    <span className="text-base font-bold text-white tracking-wide">
                        Talk<span className="text-blue-500">2</span>DB
                    </span>
                    <span className="hidden sm:inline-block h-4 w-[1px] bg-[#2C3142]/80 mx-1" />
                    <span className="hidden sm:inline-block text-[11px] font-semibold text-gray-400 capitalize bg-[#232736]/50 px-2.5 py-0.5 rounded-full">
                        Workspace
                    </span>
                </div>
            </div>

            {/* Right side: Database status pill, user email, notification bell, sign out */}
            <div className="flex items-center gap-4">
                {/* Database Connection Pill */}
                {!loading && (
                    <button
                        onClick={() => setShowConnectModal(true)}
                        className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-bold tracking-wide transition-all border outline-none cursor-pointer select-none ${dbConnected
                                ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-450 hover:bg-emerald-500/15"
                                : "bg-red-500/10 border-red-500/20 text-red-450 hover:bg-red-500/15 animate-pulse"
                            }`}
                        title="Click to manage database connection"
                    >
                        <span
                            className={`w-1.5 h-1.5 rounded-full shrink-0 ${dbConnected ? "bg-emerald-500" : "bg-red-505"
                                }`}
                            style={{
                                backgroundColor: dbConnected ? "#10b981" : "#ef4444"
                            }}
                        />
                        {dbConnected ? "Connected" : "DB Not Connected"}
                    </button>
                )}

                {/* Vertical Divider */}
                <span className="h-5 w-[1px] bg-[#2C3142]/85" />

                {/* Logged in User Email */}
                {session?.user?.email && (
                    <span className="hidden md:inline-block text-xs font-semibold text-gray-300 font-mono">
                        {session.user.email}
                    </span>
                )}

                {/* Bell Icon Placeholder */}
                <button className="text-gray-400 hover:text-white p-1 rounded-lg hover:bg-[#232736]/50 transition-all">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M14.857 17.082a2.384 2.384 0 01-1.467 1.357 2.392 2.392 0 01-3.477-1.357m0 0a2.385 2.385 0 01-.47-1.636V11a4.871 4.871 0 012.336-4.179 2.392 2.392 0 013.714 0 4.871 4.871 0 012.337 4.18v4.446c0 .597-.107 1.18-.312 1.733m-9.754 0a3.83 3.83 0 001.953 2.122m3.693-2.122a3.83 3.83 0 001.953 2.122M4 9.75h.008v.008H4V9.75zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z" />
                    </svg>
                </button>

                {/* Sign Out Button */}
                <button
                    onClick={() => signOut({ callbackUrl: "/auth/login" })}
                    className="px-3 py-1.5 text-xs font-semibold text-gray-400 hover:text-white bg-transparent hover:bg-red-500/10 border border-[#2C3142] hover:border-red-500/30 rounded-lg transition-all"
                >
                    Sign Out
                </button>
            </div>
        </header>
    );
}
