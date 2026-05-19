"use client";
import React from "react";
import { useSession, signOut } from "next-auth/react";

export default function TopBar() {
    const { data: session } = useSession();

    return (
        <header className="h-16 border-b border-[#2d3154] bg-[#1a1d2e] flex items-center justify-between px-6 z-30">
            <div className="flex items-center gap-2">
                <span className="text-sm font-semibold text-gray-300">Workspace</span>
                <span className="text-xs px-2 py-0.5 rounded bg-indigo-950 text-indigo-400 border border-indigo-900">
                    v2.0 Beta
                </span>
            </div>

            <div className="flex items-center gap-4">
                {session?.user && (
                    <div className="flex flex-col text-right">
                        <span className="text-sm font-semibold text-white">
                            {session.user.name || "Database Administrator"}
                        </span>
                        <span className="text-xs text-gray-400">{session.user.email}</span>
                    </div>
                )}

                <button
                    onClick={() => signOut({ callbackUrl: "/auth/login" })}
                    className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-indigo-950 hover:bg-[#242840] border border-[#2d3154] text-indigo-300 hover:text-white transition-all"
                >
                    Sign Out
                </button>
            </div>
        </header>
    );
}
