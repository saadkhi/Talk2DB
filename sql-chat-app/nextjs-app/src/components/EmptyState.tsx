"use client";

import React from "react";
import styles from "./EmptyState.module.css";

interface EmptyStateProps {
    onSuggest: (query: string) => void;
}

const EmptyState: React.FC<EmptyStateProps> = ({ onSuggest }) => {
    const suggestions = [
        { text: "List the top 10 customers by revenue", icon: "📊" },
        { text: "Show daily signups for the last month", icon: "📈" },
        { text: "Find orders with pending status", icon: "⏳" },
        { text: "Summarize product stock levels", icon: "📦" },
    ];

    return (
        <div className={styles.container}>
            <div className={styles.hero}>
                <div className={styles.logo}>T2</div>
                <h1 className={styles.title}>Talk2DB Intelligence</h1>
                <p className={styles.subtitle}>
                    Query your database in natural language. Powered by fine-tuned SQL models.
                </p>
            </div>

            <div className={styles.suggestionGrid}>
                {suggestions.map((suggestion, i) => (
                    <button
                        key={i}
                        onClick={() => onSuggest(suggestion.text)}
                        className={`${styles.suggestionChip} animate-slide-up`}
                        style={{ animationDelay: `${i * 0.1}s` }}
                    >
                        <span className={styles.suggestionIcon}>{suggestion.icon}</span>
                        <span className={styles.suggestionText}>{suggestion.text}</span>
                        <svg className={styles.arrowIcon} width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                            <line x1="7" y1="17" x2="17" y2="7"></line>
                            <polyline points="7 7 17 7 17 17"></polyline>
                        </svg>
                    </button>
                ))}
            </div>
        </div>
    );
};

export default EmptyState;
