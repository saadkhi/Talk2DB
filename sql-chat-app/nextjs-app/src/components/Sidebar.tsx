"use client";

import React, { useState } from "react";
import styles from "./Sidebar.module.css";

interface Conversation {
    id: string;
    title: string;
    updatedAt: string;
}

interface SidebarProps {
    conversations: Conversation[];
    currentConversationId: string | null;
    onSelectConversation: (id: string) => void;
    onNewChat: () => void;
    onDeleteConversation: (id: string, e: React.MouseEvent) => void;
    username: string;
    isOpen?: boolean;
    onToggle?: () => void;
}

const Sidebar: React.FC<SidebarProps> = ({
    conversations,
    currentConversationId,
    onSelectConversation,
    onNewChat,
    onDeleteConversation,
    username,
    isOpen,
    onToggle,
}) => {
    const [isCollapsed, setIsCollapsed] = useState(false);

    const getRelativeTime = (date: string) => {
        const now = new Date();
        const then = new Date(date);
        const diff = now.getTime() - then.getTime();
        const hours = Math.floor(diff / (1000 * 60 * 60));
        if (hours < 1) return "Just now";
        if (hours < 24) return `${hours}h ago`;
        return then.toLocaleDateString(undefined, { month: "short", day: "numeric" });
    };

    const groupConversations = () => {
        const groups: { [key: string]: Conversation[] } = {
            Today: [],
            Yesterday: [],
            "Last 7 days": [],
            Older: [],
        };

        const now = new Date();
        now.setHours(0, 0, 0, 0);
        const yesterday = new Date(now);
        yesterday.setDate(yesterday.getDate() - 1);
        const lastWeek = new Date(now);
        lastWeek.setDate(lastWeek.getDate() - 7);

        conversations.forEach((conv) => {
            const date = new Date(conv.updatedAt);
            if (date >= now) groups.Today.push(conv);
            else if (date >= yesterday) groups.Yesterday.push(conv);
            else if (date >= lastWeek) groups["Last 7 days"].push(conv);
            else groups.Older.push(conv);
        });

        return groups;
    };

    const groups = groupConversations();

    return (
        <>
            <div
                className={`${styles.overlay} ${isOpen ? styles.overlayActive : ""}`}
                onClick={onToggle}
            />
            <aside className={`${styles.sidebar} ${isCollapsed ? styles.sidebarCollapsed : ""} ${isOpen ? styles.sidebarActive : ""}`}>
                <div className={styles.header}>
                    <div className={styles.logo}>
                        <div className={styles.logoIcon}>T2</div>
                        <span>Talk2DB</span>
                    </div>
                    <button
                        className={styles.collapseBtn}
                        onClick={() => setIsCollapsed(!isCollapsed)}
                        title={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
                    >
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
                            <line x1="9" y1="3" x2="9" y2="21"></line>
                        </svg>
                    </button>
                </div>

                <div className={styles.newChatWrapper}>
                    <button className={styles.newChatBtn} onClick={onNewChat}>
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                            <line x1="12" y1="5" x2="12" y2="19"></line>
                            <line x1="5" y1="12" x2="19" y2="12"></line>
                        </svg>
                        New Chat
                    </button>
                </div>

                <div className={styles.scrollArea}>
                    {Object.entries(groups).map(([name, convs]) => (
                        convs.length > 0 && (
                            <div key={name}>
                                <div className={styles.sectionHeader}>{name}</div>
                                {convs.map((conv) => (
                                    <div
                                        key={conv.id}
                                        className={`${styles.convItem} ${currentConversationId === conv.id ? styles.convItemActive : ""}`}
                                        onClick={() => onSelectConversation(conv.id)}
                                    >
                                        <span className={styles.convTitle}>{conv.title || "Untitled Chat"}</span>
                                        <span className={styles.convTime}>{getRelativeTime(conv.updatedAt)}</span>
                                        <button
                                            className={styles.deleteBtn}
                                            onClick={(e) => onDeleteConversation(conv.id, e)}
                                            title="Delete"
                                        >
                                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                                <polyline points="3 6 5 6 21 6"></polyline>
                                                <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                                            </svg>
                                        </button>
                                    </div>
                                ))}
                            </div>
                        )
                    ))}
                </div>

                <div className={styles.footer}>
                    <div className={styles.userAvatar}>
                        {username?.substring(0, 2).toUpperCase() || "U"}
                    </div>
                    <div className={styles.userInfo}>
                        <div className={styles.userName}>{username}</div>
                    </div>
                    <button className={styles.settingsBtn}>
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <circle cx="12" cy="12" r="3"></circle>
                            <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33 1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82 1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path>
                        </svg>
                    </button>
                </div>
            </aside>
        </>
    );
};

export default Sidebar;
