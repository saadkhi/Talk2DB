"use client";
import React from "react";
import Sidebar from "./Sidebar";
import TopBar from "./TopBar";

interface DashboardShellProps {
    children: React.ReactNode;
}

export default function DashboardShell({ children }: DashboardShellProps) {
    return (
        <div className="flex min-h-screen bg-[#0f1117] text-white">
            <Sidebar />
            <div className="flex-1 ml-60 flex flex-col min-h-screen">
                <TopBar />
                <main className="flex-1 p-6 overflow-y-auto">{children}</main>
            </div>
        </div>
    );
}
