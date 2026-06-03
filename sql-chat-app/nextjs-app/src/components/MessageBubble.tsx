"use client";

import React from "react";
import styles from "./MessageBubble.module.css";

interface MessageBubbleProps {
    content: string;
    timestamp?: string;
    onEdit?: () => void;
}

const MessageBubble: React.FC<MessageBubbleProps> = ({ content, timestamp, onEdit }) => {
    return (
        <div className={`${styles.container} animate-slide-up`}>
            <div className={styles.bubble}>
                {content}
                {onEdit && (
                    <button className={styles.editBtn} onClick={onEdit} title="Edit & Resend">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                            <path d="M18.5 2.5a2.121 2.121 0 1 1 3 3L12 15l-4 1 1-4Z"></path>
                        </svg>
                    </button>
                )}
            </div>
            <div className={styles.timestamp}>{timestamp || "Just now"}</div>
        </div>
    );
};

export default MessageBubble;
