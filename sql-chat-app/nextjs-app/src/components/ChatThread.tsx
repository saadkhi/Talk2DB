"use client";

import React, { useRef, useEffect } from "react";
import styles from "./ChatThread.module.css";
import MessageBubble from "./MessageBubble";
import AssistantCard from "./AssistantCard";
import TypingIndicator from "./TypingIndicator";
import EmptyState from "./EmptyState";

interface Message {
    role: "user" | "assistant";
    content: string;
}

interface ChatThreadProps {
    messages: Message[];
    isLoading?: boolean;
    onSuggest: (query: string) => void;
    onEditMessage: (content: string) => void;
    title?: string;
    onToggleContext: () => void;
    isMobile?: boolean;
    onOpenSidebar?: () => void;
}

const ChatThread: React.FC<ChatThreadProps> = ({
    messages,
    isLoading,
    onSuggest,
    onEditMessage,
    title,
    onToggleContext,
    isMobile,
    onOpenSidebar
}) => {
    const scrollRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [messages, isLoading]);

    return (
        <div className={styles.container}>
            <header className={styles.header}>
                <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                    {isMobile && (
                        <button className={styles.menuBtn} onClick={onOpenSidebar}>
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <line x1="3" y1="12" x2="21" y2="12"></line>
                                <line x1="3" y1="6" x2="21" y2="6"></line>
                                <line x1="3" y1="18" x2="21" y2="18"></line>
                            </svg>
                        </button>
                    )}
                    <div className={styles.breadcrumb}>
                        Talk2DB / <span className={styles.breadcrumbActive}>{title || "New Conversation"}</span>
                    </div>
                </div>
                <div className={styles.headerActions}>
                    <button className={styles.exportBtn}>Export SQL</button>
                    <button className={styles.exportBtn} onClick={onToggleContext}>
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
                            <line x1="15" y1="3" x2="15" y2="21"></line>
                        </svg>
                    </button>
                </div>
            </header>

            <div className={styles.thread} ref={scrollRef}>
                {messages.length === 0 ? (
                    <EmptyState onSuggest={onSuggest} />
                ) : (
                    messages.map((msg, i) => (
                        msg.role === "user" ? (
                            <MessageBubble
                                key={i}
                                content={msg.content}
                                onEdit={() => onEditMessage(msg.content)}
                            />
                        ) : (
                            <AssistantCard key={i} content={msg.content} />
                        )
                    ))
                )}
                {isLoading && (
                    <div className={styles.typingWrapper}>
                        <TypingIndicator />
                    </div>
                )}
            </div>
        </div>
    );
};

export default ChatThread;
