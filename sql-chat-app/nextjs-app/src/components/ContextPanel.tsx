"use client";

import React from "react";
import styles from "./ContextPanel.module.css";

interface ContextPanelProps {
    isOpen: boolean;
    onToggle: () => void;
    history?: { sql: string; timestamp: string }[];
}

const ContextPanel: React.FC<ContextPanelProps> = ({ isOpen, onToggle, history = [] }) => {
    const [schema, setSchema] = React.useState<{ name: string; columns: { name: string; type: string }[] }[]>([]);
    const [isLoading, setIsLoading] = React.useState(false);

    React.useEffect(() => {
        if (isOpen) {
            fetchSchema();
        }
    }, [isOpen]);

    const fetchSchema = async () => {
        setIsLoading(true);
        try {
            const res = await fetch("/api/schema");
            if (res.ok) {
                const data = await res.json();
                setSchema(data.tables || []);
            }
        } catch (err) {
            console.error("Failed to fetch schema:", err);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <aside className={`${styles.panel} ${!isOpen ? styles.panelCollapsed : ""}`}>
            <div className={styles.header}>
                <span className={styles.title}>Query Context</span>
                <button className={styles.closeBtn} onClick={onToggle}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <line x1="18" y1="6" x2="6" y2="18"></line>
                        <line x1="6" y1="6" x2="18" y2="18"></line>
                    </svg>
                </button>
            </div>

            <div className={styles.content}>
                <div className={styles.section}>
                    <div className={styles.sectionLabel}>Schema Hints</div>
                    {isLoading ? (
                        <div className={styles.loading}>Loading schema...</div>
                    ) : schema.length > 0 ? (
                        schema.map((table, i) => (
                            <div key={i} className={styles.schemaHint}>
                                <div className={styles.tableName}>
                                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ marginRight: "6px", opacity: 0.6 }}>
                                        <path d="M12 3v18"></path>
                                        <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
                                        <line x1="3" y1="9" x2="21" y2="9"></line>
                                        <line x1="3" y1="15" x2="21" y2="15"></line>
                                    </svg>
                                    {table.name}
                                </div>
                                <div className={styles.columnList}>
                                    {table.columns.map(c => `${c.name} (${c.type})`).join(", ")}
                                </div>
                            </div>
                        ))
                    ) : (
                        <div className={styles.empty}>No table information available.</div>
                    )}
                </div>

                <div className={styles.section}>
                    <div className={styles.sectionLabel}>Execution History</div>
                    {history.length > 0 ? (
                        history.map((item, i) => (
                            <div key={i} className={styles.historyItem}>
                                <div className={styles.historySQL}>{item.sql}</div>
                                <div className={styles.historyTime}>{item.timestamp}</div>
                            </div>
                        ))
                    ) : (
                        <div style={{ fontSize: "12px", color: "var(--text-tertiary)" }}>
                            No recent queries in this session
                        </div>
                    )}
                </div>
            </div>
        </aside>
    );
};

export default ContextPanel;
