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

    useEffect(() => {
        const handleResize = () => {
            const w = window.innerWidth;
            const mobile = w < 768;
            setIsMobile(mobile);
            if (mobile) setIsMobileOpen(false);
            else if (w < 1024) setIsCollapsed(true);
            else setIsCollapsed(false);
        };
        handleResize();
        window.addEventListener("resize", handleResize);
        return () => window.removeEventListener("resize", handleResize);
    }, []);

    const sidebarW = isMobile ? 0 : isCollapsed ? 64 : 240;

    return (
        <div style={{
            display: "flex",
            minHeight: "100vh",
            background: "var(--bg-base)",
            color: "#fff",
            overflow: "hidden",
        }}>
            <Sidebar
                isCollapsed={isCollapsed}
                isMobileOpen={isMobileOpen}
                onCloseMobile={() => setIsMobileOpen(false)}
                onToggleCollapse={() => setIsCollapsed(p => !p)}
            />

            <div style={{
                flex: 1,
                display: "flex",
                flexDirection: "column",
                minHeight: "100vh",
                marginLeft: sidebarW,
                transition: "margin-left 0.3s ease",
            }}>
                <TopBar
                    isCollapsed={isCollapsed}
                    onToggleCollapse={() => setIsCollapsed(p => !p)}
                    onOpenMobile={() => setIsMobileOpen(p => !p)}
                    isMobile={isMobile}
                />
                <main style={{
                    flex: 1,
                    padding: "28px 32px",
                    overflowY: "auto",
                    maxWidth: "1280px",
                    width: "100%",
                    margin: "0 auto",
                    boxSizing: "border-box",
                }}>
                    {children}
                </main>
            </div>
        </div>
    );
}
