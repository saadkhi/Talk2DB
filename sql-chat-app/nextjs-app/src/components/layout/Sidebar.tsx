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
            <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12l8.954-8.955c.44-.439 1.152-.439 1.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21h8.25" />
            </svg>
        ),
    },
    {
        href: "/dashboard/query-studio",
        label: "Query Studio",
        icon: (
            <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M17.25 6.75L22.5 12l-5.25 5.25m-10.5 0L1.5 12l5.25-5.25m7.5-3l-4.5 16.5" />
            </svg>
        ),
    },
    {
        href: "/dashboard/data-visualizer",
        label: "Data Visualizer",
        icon: (
            <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M7.5 14.25v2.25m3-4.5v4.5m3-6.75v6.75m3-9v9M6 20.25h12A2.25 2.25 0 0020.25 18V6A2.25 2.25 0 0018 3.75H6A2.25 2.25 0 003.75 6v12A2.25 2.25 0 006 20.25z" />
            </svg>
        ),
    },
    {
        href: "/dashboard/schema-explorer",
        label: "Schema Explorer",
        icon: (
            <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6A2.25 2.25 0 016 3.75h2.25A2.25 2.25 0 0110.5 6v2.25a2.25 2.25 0 01-2.25 2.25H6a2.25 2.25 0 01-2.25-2.25V6zM3.75 15.75A2.25 2.25 0 016 13.5h2.25a2.25 2.25 0 012.25 2.25V18a2.25 2.25 0 01-2.25 2.25H6A2.25 2.25 0 013.75 18v-2.25zM13.5 6a2.25 2.25 0 012.25-2.25H18A2.25 2.25 0 0120.25 6v2.25A2.25 2.25 0 0118 10.5h-2.25a2.25 2.25 0 01-2.25-2.25V6zM13.5 15.75a2.25 2.25 0 012.25-2.25H18a2.25 2.25 0 012.25 2.25V18A2.25 2.25 0 0118 20.25h-2.25A2.25 2.25 0 0113.5 18v-2.25z" />
            </svg>
        ),
    },
    {
        href: "/dashboard/report-builder",
        label: "Report Builder",
        icon: (
            <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
            </svg>
        ),
    },
    {
        href: "/dashboard/data-profiler",
        label: "Data Profiler",
        icon: (
            <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h3.75M9 15h3.75m-7.5 6H18a2.25 2.25 0 002.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 00-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 00.75-.75 2.25 2.25 0 00-.1-.664m-5.8 0A2.251 2.251 0 0113.5 2.25H15c1.012 0 1.867.668 2.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25z" />
            </svg>
        ),
    },
];

const SECONDARY_ITEMS = [
    {
        href: "/dashboard/history",
        label: "History",
        icon: (
            <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
        ),
    },
    {
        href: "/dashboard/saved-queries",
        label: "Saved Queries",
        icon: (
            <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M17.593 3.322c1.1.128 1.907 1.077 1.907 2.185V21L12 17.25 4.5 21V5.507c0-1.108.806-2.057 1.907-2.185a48.507 48.507 0 0111.186 0z" />
            </svg>
        ),
    },
    {
        href: "/dashboard/settings",
        label: "Settings",
        icon: (
            <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.324.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 011.37.49l1.296 2.247a1.125 1.125 0 01-.26 1.431l-1.003.827c-.293.24-.438.613-.431.992a6.759 6.759 0 010 .255c-.007.378.138.75.43.99l1.005.828c.424.35.534.954.26 1.43l-1.298 2.247a1.125 1.125 0 01-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.57 6.57 0 01-.22.128c-.331.183-.581.495-.644.869l-.213 1.28c-.09.543-.56.941-1.11.941h-2.594c-.55 0-1.02-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 01-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 01-1.369-.49l-1.297-2.247a1.125 1.125 0 01.26-1.431l1.004-.827c.292-.24.437-.613.43-.992a6.932 6.932 0 010-.255c.007-.378-.138-.75-.43-.99l-1.004-.828a1.125 1.125 0 01-.26-1.43l1.297-2.247a1.125 1.125 0 011.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.087.22-.128.332-.183.582-.495.644-.869l.214-1.281z" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
        ),
    },
    {
        href: "/dashboard/help",
        label: "Help & Docs",
        icon: (
            <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9.879 7.519c1.171-1.025 3.071-1.025 4.242 0 1.172 1.025 1.172 2.687 0 3.712-.203.179-.43.326-.67.442-.745.361-1.45.999-1.45 1.827v.75M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9 5.25h.008v.008H12v-.008z" />
            </svg>
        ),
    },
];

export default function Sidebar({ isCollapsed, isMobileOpen, onCloseMobile, onToggleCollapse }: SidebarProps) {
    const pathname = usePathname();
    const { data: session } = useSession();

    const userName = session?.user?.name || session?.user?.email?.split("@")[0] || "User";
    const userEmail = session?.user?.email || "";
    const initials = userName.slice(0, 2).toUpperCase();

    const s = {
        sidebar: {
            display: "flex",
            flexDirection: "column" as const,
            height: "100%",
            background: "#0d0f1a",
            borderRight: "1px solid rgba(255,255,255,0.06)",
            overflow: "hidden",
        },
        header: {
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: isCollapsed ? "0 12px" : "0 16px",
            height: "56px",
            borderBottom: "1px solid rgba(255,255,255,0.06)",
            flexShrink: 0,
        },
        brand: {
            display: "flex",
            alignItems: "center",
            gap: "10px",
        },
        logoBox: {
            width: "28px",
            height: "28px",
            borderRadius: "8px",
            background: "linear-gradient(135deg,#6366f1,#8b5cf6)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexShrink: 0,
        },
        brandName: {
            fontSize: "15px",
            fontWeight: 700,
            color: "#fff",
            letterSpacing: "-0.3px",
        },
        collapseBtn: {
            background: "none",
            border: "none",
            cursor: "pointer",
            color: "#4B5563",
            padding: "4px",
            borderRadius: "6px",
            display: "flex",
            alignItems: "center",
            transition: "color 0.15s,background 0.15s",
        },
        nav: {
            flex: 1,
            padding: "8px",
            overflowY: "auto" as const,
            display: "flex",
            flexDirection: "column" as const,
            gap: "1px",
        },
        divider: {
            height: "1px",
            background: "rgba(255,255,255,0.05)",
            margin: "8px 0",
        },
        proTip: {
            margin: "0 8px 8px",
            padding: "10px 12px",
            borderRadius: "10px",
            background: "rgba(99,102,241,0.08)",
            border: "1px solid rgba(99,102,241,0.15)",
        },
        proTipHeader: {
            display: "flex",
            alignItems: "center",
            gap: "6px",
            marginBottom: "6px",
        },
        proTipLabel: {
            fontSize: "10px",
            fontWeight: 700,
            color: "#6366f1",
            textTransform: "uppercase" as const,
            letterSpacing: "0.08em",
        },
        proTipText: {
            fontSize: "11px",
            color: "#6B7280",
            lineHeight: 1.5,
        },
        userFooter: {
            borderTop: "1px solid rgba(255,255,255,0.06)",
            padding: "10px 8px",
            flexShrink: 0,
        },
        userRow: {
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "6px 8px",
            borderRadius: "8px",
            cursor: "pointer",
            gap: "8px",
        },
        avatar: {
            width: "28px",
            height: "28px",
            borderRadius: "50%",
            background: "linear-gradient(135deg,#6366f1,#8b5cf6)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: "11px",
            fontWeight: 700,
            color: "#fff",
            flexShrink: 0,
        },
        userInfo: {
            flex: 1,
            minWidth: 0,
        },
        userName: {
            fontSize: "12px",
            fontWeight: 600,
            color: "#fff",
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap" as const,
        },
        userEmail: {
            fontSize: "10px",
            color: "#4B5563",
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap" as const,
        },
        signOutBtn: {
            background: "none",
            border: "none",
            cursor: "pointer",
            color: "#4B5563",
            padding: "4px",
            borderRadius: "4px",
            display: "flex",
            flexShrink: 0,
        },
    };

    const NavItem = ({ href, label, icon }: { href: string; label: string; icon: React.ReactNode }) => {
        const isActive = pathname === href;
        return (
            <Link href={href} onClick={onCloseMobile} title={isCollapsed ? label : undefined}
                style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "10px",
                    padding: isCollapsed ? "9px" : "8px 10px",
                    borderRadius: "8px",
                    fontSize: "13px",
                    fontWeight: isActive ? 600 : 500,
                    color: isActive ? "#fff" : "#6B7280",
                    background: isActive ? "#6366f1" : "transparent",
                    textDecoration: "none",
                    transition: "all 0.15s",
                    justifyContent: isCollapsed ? "center" : "flex-start",
                }}
                onMouseEnter={e => { if (!isActive) { (e.currentTarget as HTMLElement).style.background = "rgba(255,255,255,0.05)"; (e.currentTarget as HTMLElement).style.color = "#fff"; } }}
                onMouseLeave={e => { if (!isActive) { (e.currentTarget as HTMLElement).style.background = "transparent"; (e.currentTarget as HTMLElement).style.color = "#6B7280"; } }}
            >
                <span style={{ flexShrink: 0, display: "flex" }}>{icon}</span>
                {!isCollapsed && <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{label}</span>}
            </Link>
        );
    };

    const SidebarContent = (
        <div style={s.sidebar}>
            {/* Brand header */}
            <div style={s.header}>
                <div style={s.brand}>
                    <div style={s.logoBox}>
                        <svg width="15" height="15" fill="none" stroke="white" strokeWidth="2" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M20.25 6.375c0 2.278-3.694 4.125-8.25 4.125S3.75 8.653 3.75 6.375m16.5 0c0-2.278-3.694-4.125-8.25-4.125S3.75 4.097 3.75 6.375m16.5 0v11.25c0 2.278-3.694 4.125-8.25 4.125s-8.25-1.847-8.25-4.125V6.375m16.5 2.625c0 2.278-3.694 4.125-8.25 4.125s-8.25-1.847-8.25-4.125" />
                        </svg>
                    </div>
                    {!isCollapsed && <span style={s.brandName}>Talk2DB</span>}
                </div>
                {!isCollapsed && (
                    <button onClick={onToggleCollapse} style={s.collapseBtn}
                        onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = "#fff"; (e.currentTarget as HTMLElement).style.background = "rgba(255,255,255,0.05)"; }}
                        onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = "#4B5563"; (e.currentTarget as HTMLElement).style.background = "none"; }}
                    >
                        <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M18.75 19.5l-7.5-7.5 7.5-7.5m-6 15L5.25 12l7.5-7.5" />
                        </svg>
                    </button>
                )}
            </div>

            {/* Nav */}
            <nav style={s.nav}>
                {MAIN_ITEMS.map(item => <NavItem key={item.href} {...item} />)}
                <div style={s.divider} />
                {SECONDARY_ITEMS.map(item => <NavItem key={item.href} {...item} />)}
            </nav>

            {/* Pro Tip */}
            {!isCollapsed && (
                <div style={s.proTip}>
                    <div style={s.proTipHeader}>
                        <svg width="12" height="12" fill="#6366f1" viewBox="0 0 24 24">
                            <path d="M11.48 3.499a.562.562 0 011.04 0l2.125 5.111a.563.563 0 00.475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 00-.182.557l1.285 5.385a.562.562 0 01-.84.61l-4.725-2.885a.563.563 0 00-.586 0L6.982 20.54a.562.562 0 01-.84-.61l1.285-5.386a.562.562 0 00-.182-.557l-4.204-3.602a.563.563 0 01.321-.988l5.518-.442a.563.563 0 00.475-.345L11.48 3.5z" />
                        </svg>
                        <span style={s.proTipLabel}>Pro Tip</span>
                    </div>
                    <p style={s.proTipText}>Ask complex questions in plain English. Talk2DB will generate the SQL for you.</p>
                </div>
            )}

            {/* User footer */}
            <div style={s.userFooter}>
                {!isCollapsed ? (
                    <div style={s.userRow}
                        onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = "rgba(255,255,255,0.04)"; }}
                        onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = "transparent"; }}
                    >
                        <div style={s.avatar}>{initials}</div>
                        <div style={s.userInfo}>
                            <div style={s.userName}>{userName}</div>
                            <div style={s.userEmail}>{userEmail}</div>
                        </div>
                        <button onClick={() => signOut({ callbackUrl: "/auth/login" })} style={s.signOutBtn} title="Sign out"
                            onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = "#ef4444"; }}
                            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = "#4B5563"; }}
                        >
                            <svg width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15M12 9l-3 3m0 0l3 3m-3-3h12.75" />
                            </svg>
                        </button>
                    </div>
                ) : (
                    <div style={{ display: "flex", justifyContent: "center" }}>
                        <div style={s.avatar} title={userName}>{initials}</div>
                    </div>
                )}
            </div>
        </div>
    );

    const W = isCollapsed ? 64 : 240;

    return (
        <>
            {/* Mobile overlay */}
            {isMobileOpen && (
                <div onClick={onCloseMobile} style={{
                    position: "fixed", inset: 0, zIndex: 40,
                    background: "rgba(0,0,0,0.6)", backdropFilter: "blur(4px)",
                }} />
            )}
            {/* Mobile drawer */}
            <aside style={{
                position: "fixed", inset: "0 auto 0 0", zIndex: 50, width: 240,
                transform: isMobileOpen ? "translateX(0)" : "translateX(-100%)",
                transition: "transform 0.3s ease",
            }} className="md-hidden">
                {SidebarContent}
            </aside>
            {/* Desktop sidebar */}
            <aside style={{
                position: "fixed", inset: "0 auto 0 0", zIndex: 30, width: W,
                transition: "width 0.3s ease",
                display: "none",
            }} className="desktop-sidebar">
                {SidebarContent}
            </aside>
            {/* Desktop sidebar (always visible on md+) */}
            <style>{`
                @media (min-width: 768px) {
                    .desktop-sidebar { display: block !important; }
                    .md-hidden { display: none !important; }
                }
            `}</style>
        </>
    );
}
