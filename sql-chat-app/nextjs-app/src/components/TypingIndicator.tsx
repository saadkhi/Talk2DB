"use client";

import React from "react";

const TypingIndicator = () => {
    return (
        <div style={{ display: "flex", gap: "4px", padding: "12px 16px", background: "var(--bg-surface)", width: "fit-content", borderRadius: "12px", border: "1px solid var(--border)" }}>
            <div style={{ width: "6px", height: "6px", background: "var(--accent)", borderRadius: "50%", animation: "pulse 1s infinite ease-in-out" }}></div>
            <div style={{ width: "6px", height: "6px", background: "var(--accent)", borderRadius: "50%", animation: "pulse 1s infinite ease-in-out 0.2s" }}></div>
            <div style={{ width: "6px", height: "6px", background: "var(--accent)", borderRadius: "50%", animation: "pulse 1s infinite ease-in-out 0.4s" }}></div>
        </div>
    );
};

export default TypingIndicator;
