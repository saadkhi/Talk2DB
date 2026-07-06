"use client";

import React from "react";

interface SQLHighlighterProps {
    sql: string;
}

const SQLHighlighter: React.FC<SQLHighlighterProps> = ({ sql }) => {
    const highlightSQL = (text: string) => {
        const keywords = /\b(SELECT|FROM|WHERE|JOIN|LEFT|RIGHT|INNER|ON|GROUP|BY|ORDER|LIMIT|OFFSET|INSERT|INTO|UPDATE|SET|DELETE|CREATE|TABLE|DROP|ALTER|AND|OR|NOT|IN|NULL|AS|IS|DISTINCT|COUNT|SUM|AVG|MIN|MAX|HAVING|EXISTS|UNION|ALL|CASE|WHEN|THEN|ELSE|END|WITH|DESC|ASC)\b/gi;
        const tables = /\b([a-zA-Z_][a-zA-Z0-9_]*)\b(?=\s*\.|\s*\(|\s+AS\s+|$|\s+JOIN\s+|\s+FROM\s+)/gi; // Simplified attempt
        const strings = /'[^']*'|"[^"]*"/g;
        const numbers = /\b\d+\b/g;

        let parts: { type: string; value: string }[] = [];
        let lastIndex = 0;

        // This is a naive implementation, but fits the "lightweight client-side" requirement
        const tokens = [
            { type: "keyword", regex: keywords },
            { type: "string", regex: strings },
            { type: "number", regex: numbers },
        ];

        // Combine all regex into one and sort by index
        const allMatches: { type: string; index: number; value: string }[] = [];

        tokens.forEach(({ type, regex }) => {
            let match;
            const r = new RegExp(regex); // Reset regex
            while ((match = r.exec(text)) !== null) {
                allMatches.push({ type, index: match.index, value: match[0] });
            }
        });

        allMatches.sort((a, b) => a.index - b.index);

        // Filter out overlapping matches (e.g. keyword inside string)
        const filteredMatches: typeof allMatches = [];
        let currentPos = 0;
        for (const match of allMatches) {
            if (match.index >= currentPos) {
                filteredMatches.push(match);
                currentPos = match.index + match.value.length;
            }
        }

        filteredMatches.forEach((match) => {
            if (match.index > lastIndex) {
                parts.push({ type: "text", value: text.substring(lastIndex, match.index) });
            }
            parts.push({ type: match.type, value: match.value });
            lastIndex = match.index + match.value.length;
        });

        if (lastIndex < text.length) {
            parts.push({ type: "text", value: text.substring(lastIndex) });
        }

        return parts.map((part, i) => {
            const style: React.CSSProperties = {};
            if (part.type === "keyword") style.color = "var(--sql-keyword)";
            if (part.type === "string") style.color = "var(--sql-string)";
            if (part.type === "number") style.color = "var(--sql-number)";
            if (part.type === "table") style.color = "var(--sql-table)";

            return (
                <span
                    key={i}
                    style={{
                        ...style,
                        opacity: 0,
                        animation: `fadeIn 300ms ease forwards ${i * 20}ms`
                    }}
                >
                    {part.value}
                </span>
            );
        });
    };

    return (
        <div style={{
            background: "rgba(0, 0, 0, 0.4)",
            border: "1px solid rgba(255, 255, 255, 0.05)",
            backdropFilter: "blur(12px)",
            borderRadius: "12px",
            padding: "16px",
            overflowX: "auto"
        }}>
            <pre style={{
                margin: 0,
                fontFamily: "var(--font-mono)",
                fontSize: "14px",
                lineHeight: 1.6,
                color: "var(--text-primary)"
            }}>
                <code>{highlightSQL(sql)}</code>
            </pre>
        </div>
    );
};

export default SQLHighlighter;
