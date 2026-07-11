"use client";

import React from "react";
import { useDatabase } from "@/context/DatabaseContext";

interface TopBarProps {
    isCollapsed: boolean;
    onToggleCollapse: () => void;
    onOpenMobile: () => void;
    isMobile: boolean;
}

export default function TopBar({ isCollapsed, onToggleCollapse, onOpenMobile, isMobile }: TopBarProps) {
    const { dbConnected, loading, setShowConnectModal } = useDatabase();

    return (
        <header style={{
            position: "sticky",
            top: 0,
            zIndex: 20,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            height: "56px",
            padding: "0 20px",
            background: "rgba(13,15,26,0.95)",
            borderBottom: "1px solid rgba(255,255,255,0.06)",
            backdropFilter: "blur(12px)",
            flexShrink: 0,
        }}>
            {/* Left */}
            <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                {isMobile && (
                    <button onClick={onOpenMobile} style={{
                        background: "none", border: "none", cursor: "pointer",
                        color: "#6B7280", padding: "6px", borderRadius: "6px", display: "flex",
                    }}>
                        <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />
                        </svg>
                    </button>
                )}
                {!isMobile && isCollapsed && (
                    <button onClick={onToggleCollapse} style={{
                        background: "none", border: "none", cursor: "pointer",
                        color: "#6B7280", padding: "6px", borderRadius: "6px", display: "flex",
                    }}>
                        <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />
                        </svg>
                    </button>
                )}

                {/* DB status pill */}
                {!loading && (
                    <button onClick={() => setShowConnectModal(true)} style={{
                        display: "flex", alignItems: "center", gap: "6px",
                        padding: "5px 12px", borderRadius: "20px", fontSize: "11px", fontWeight: 600,
                        border: dbConnected ? "1px solid rgba(16,185,129,0.25)" : "1px solid rgba(239,68,68,0.25)",
                        background: dbConnected ? "rgba(16,185,129,0.08)" : "rgba(239,68,68,0.08)",
                        color: dbConnected ? "#34d399" : "#f87171",
                        cursor: "pointer",
                        transition: "all 0.15s",
                    }}>
                        <span style={{
                            width: "6px", height: "6px", borderRadius: "50%", flexShrink: 0,
                            background: dbConnected ? "#10b981" : "#ef4444",
                            boxShadow: dbConnected ? "0 0 6px #10b981" : "0 0 6px #ef4444",
                        }} />
                        {dbConnected ? "Connected" : "Not Connected"}
                    </button>
                )}
            </div>

            {/* Right */}
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <a href="https://github.com" target="_blank" rel="noopener noreferrer" style={{
                    display: "flex", alignItems: "center", gap: "6px",
                    padding: "6px 14px", borderRadius: "8px", fontSize: "12px", fontWeight: 500,
                    color: "#9CA3AF", border: "1px solid rgba(255,255,255,0.07)",
                    background: "rgba(255,255,255,0.03)", textDecoration: "none",
                    transition: "all 0.15s",
                }}
                    onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = "#fff"; (e.currentTarget as HTMLElement).style.background = "rgba(255,255,255,0.07)"; }}
                    onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = "#9CA3AF"; (e.currentTarget as HTMLElement).style.background = "rgba(255,255,255,0.03)"; }}
                >
                    <svg width="14" height="14" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" />
                    </svg>
                    Star on GitHub
                </a>

                <button style={{
                    background: "none", border: "1px solid rgba(255,255,255,0.07)",
                    borderRadius: "8px", cursor: "pointer", color: "#6B7280",
                    padding: "6px", display: "flex", transition: "all 0.15s",
                }}
                    onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = "#fff"; (e.currentTarget as HTMLElement).style.background = "rgba(255,255,255,0.05)"; }}
                    onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = "#6B7280"; (e.currentTarget as HTMLElement).style.background = "none"; }}
                >
                    <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.324.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 011.37.49l1.296 2.247a1.125 1.125 0 01-.26 1.431l-1.003.827c-.293.24-.438.613-.431.992a6.759 6.759 0 010 .255c-.007.378.138.75.43.99l1.005.828c.424.35.534.954.26 1.43l-1.298 2.247a1.125 1.125 0 01-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.57 6.57 0 01-.22.128c-.331.183-.581.495-.644.869l-.213 1.28c-.09.543-.56.941-1.11.941h-2.594c-.55 0-1.02-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 01-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 01-1.369-.49l-1.297-2.247a1.125 1.125 0 01.26-1.431l1.004-.827c.292-.24.437-.613.43-.992a6.932 6.932 0 010-.255c.007-.378-.138-.75-.43-.99l-1.004-.828a1.125 1.125 0 01-.26-1.43l1.297-2.247a1.125 1.125 0 011.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.087.22-.128.332-.183.582-.495.644-.869l.214-1.281z" />
                        <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                </button>
            </div>
        </header>
    );
}
