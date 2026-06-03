"use client";

import React from "react";
import styles from "./AssistantCard.module.css";
import SQLHighlighter from "./SQLHighlighter";
import ResultsTable from "./ResultsTable";

interface AssistantCardProps {
    content: string;
    metadata?: {
        executionTime?: string;
        rowCount?: number;
        error?: boolean;
    };
}

const AssistantCard: React.FC<AssistantCardProps> = ({ content, metadata }) => {
    // Parsing logic to split content into parts (text, sql, text, etc.)
    const parts = content.split(/(```sql[\s\S]*?```)/g);

    return (
        <div className={styles.cardContainer}>
            <div className={styles.card}>
                {parts.map((part, index) => {
                    if (part.startsWith("```sql")) {
                        const sql = part.replace(/```sql\n?|```/g, "").trim();
                        return (
                            <div key={index} className={styles.zone}>
                                <div className={styles.label}>
                                    <span>Generated SQL</span>
                                    <button
                                        className={styles.copyBtn}
                                        onClick={() => navigator.clipboard.writeText(sql)}
                                        title="Copy SQL"
                                    >
                                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                            <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                                            <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
                                        </svg>
                                    </button>
                                </div>
                                <div className={styles.sqlContainer}>
                                    <SQLHighlighter sql={sql} />
                                </div>
                                {index === 1 && ( // Only show metadata for the first SQL block for now
                                    <div className={styles.metadata}>
                                        <span className={`${styles.pill} ${styles.success} shimmer-effect`}>Executed in {metadata?.executionTime || "340ms"}</span>
                                        <span className={`${styles.pill} ${styles.success}`}>{metadata?.rowCount || 12} rows returned</span>
                                    </div>
                                )}
                            </div>
                        );
                    } else if (part.trim()) {
                        return (
                            <div key={index} className={styles.zone}>
                                <div className={styles.summary}>{part.trim()}</div>
                            </div>
                        );
                    }
                    return null;
                })}

                {/* Results table would go here if we had data in the props */}
            </div>

            <div className={styles.actions}>
                <button className={styles.actionBtn}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                        <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
                    </svg>
                    Copy
                </button>
                <button className={styles.actionBtn}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M14 9V5a3 3 0 0 0-3-3l-4 9v11h11.28a2 2 0 0 0 2-1.7l1.38-9a2 2 0 0 0-2-2.3zM7 22H4a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2h3"></path>
                    </svg>
                </button>
                <button className={styles.actionBtn}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M10 15v4a3 3 0 0 0 3 3l4-9V2H5.72a2 2 0 0 0-2 1.7l-1.38 9a2 2 0 0 0 2 2.3zm7-13h3a2 2 0 0 1 2 2v7a2 2 0 0 1-2 2h-3"></path>
                    </svg>
                </button>
                <button className={styles.actionBtn}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M23 4v6h-6"></path>
                        <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"></path>
                    </svg>
                    Regenerate
                </button>
            </div>
        </div>
    );
};

export default AssistantCard;
