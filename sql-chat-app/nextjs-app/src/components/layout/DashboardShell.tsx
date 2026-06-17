"use client";

import React, { useState, useEffect } from "react";
import Sidebar from "./Sidebar";
import TopBar from "./TopBar";

interface DashboardShellProps {
    children: React.ReactNode;
}

export default function DashboardShell({ children }: DashboardShellProps) {
    const [isCollapsed, setIsCollapsed] = useState(false);
    const [isMobileOpen, setIsMobileOpen] = useState(false);
    const [isMobile, setIsMobile] = useState(false);

    // Monitor viewport resize for responsive collapse
    useEffect(() => {
        const handleResize = () => {
            const width = window.innerWidth;
            const mobile = width < 768;
            setIsMobile(mobile);

            if (mobile) {
                setIsMobileOpen(false);
            } else if (width >= 768 && width < 1024) {
                setIsCollapsed(true);
            } else {
                setIsCollapsed(false);
            }
        };

        handleResize();
        window.addEventListener("resize", handleResize);
        return () => window.removeEventListener("resize", handleResize);
    }, []);

    const toggleCollapse = () => {
        setIsCollapsed((prev) => !prev);
    };

    const toggleMobile = () => {
        setIsMobileOpen((prev) => !prev);
    };

    return (
        <div className="flex min-h-screen bg-[#0F1117] text-white overflow-hidden">
            {/* Sidebar component */}
            <Sidebar
                isCollapsed={isCollapsed}
                isMobileOpen={isMobileOpen}
                onCloseMobile={() => setIsMobileOpen(false)}
                onToggleCollapse={toggleCollapse}
            />

            {/* Main Content Area */}
            <div
                className={`flex-1 flex flex-col min-h-screen transition-all duration-300 ${isMobile ? "ml-0" : isCollapsed ? "ml-20" : "ml-64"
                    }`}
            >
                {/* Sticky Header TopBar */}
                <TopBar
                    isCollapsed={isCollapsed}
                    onToggleCollapse={toggleCollapse}
                    onOpenMobile={toggleMobile}
                    isMobile={isMobile}
                />

                {/* Subpage Contents */}
                <main className="flex-1 p-6 md:p-8 overflow-y-auto max-w-7xl w-full mx-auto">
                    {children}
                </main>
            </div>
        </div>
    );
}
