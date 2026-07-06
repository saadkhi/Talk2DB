"use client";

import React, { useState } from "react";

interface ResultsTableProps {
    data: any[];
}

const ResultsTable: React.FC<ResultsTableProps> = ({ data }) => {
    const [showAll, setShowAll] = useState(false);

    if (!data || data.length === 0) {
        return (
            <div style={{ padding: "24px", textAlign: "center", color: "var(--text-tertiary)" }}>
                No rows returned
            </div>
        );
    }

    const headers = Object.keys(data[0]);
    const displayData = showAll ? data : data.slice(0, 50);

    return (
        <div style={{ width: "100%", overflow: "hidden", animation: "slideUp var(--transition-smooth) forwards" }}>
            <div style={{
                maxHeight: "320px",
                overflowY: "auto",
                border: "1px solid rgba(255, 255, 255, 0.05)",
                borderRadius: "16px",
                background: "rgba(0, 0, 0, 0.4)",
                backdropFilter: "blur(12px)"
            }}>
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "14px", color: "var(--text-primary)" }}>
                    <thead style={{ position: "sticky", top: 0, background: "rgba(14, 15, 20, 0.8)", backdropFilter: "blur(8px)", zIndex: 1 }}>
                        <tr>
                            {headers.map((header) => (
                                <th key={header} style={{
                                    padding: "10px 12px",
                                    textAlign: isNaN(data[0][header]) ? "left" : "right",
                                    textTransform: "uppercase",
                                    fontSize: "11px",
                                    color: "var(--text-secondary)",
                                    borderBottom: "1px solid var(--border)"
                                }}>
                                    {header}
                                </th>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        {displayData.map((row, i) => (
                            <tr key={i} style={{
                                background: i % 2 === 0 ? "rgba(255, 255, 255, 0.02)" : "transparent",
                                height: "40px",
                                transition: "background var(--transition-fast)"
                            }}
                                onMouseOver={e => e.currentTarget.style.background = "rgba(255, 255, 255, 0.05)"}
                                onMouseOut={e => e.currentTarget.style.background = i % 2 === 0 ? "rgba(255, 255, 255, 0.02)" : "transparent"}
                            >
                                {headers.map((header) => (
                                    <td key={header} style={{
                                        padding: "8px 12px",
                                        textAlign: isNaN(row[header]) ? "left" : "right",
                                        color: isNaN(row[header]) ? "var(--text-primary)" : "var(--sql-number)",
                                        fontFamily: isNaN(row[header]) ? "var(--font-main)" : "var(--font-mono)",
                                        borderBottom: i === displayData.length - 1 ? "none" : "1px solid var(--border)"
                                    }}>
                                        {row[header]?.toString() || "NULL"}
                                    </td>
                                ))}
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {
                data.length > 50 && !showAll && (
                    <button
                        onClick={() => setShowAll(true)}
                        style={{
                            marginTop: "16px",
                            width: "100%",
                            padding: "12px",
                            background: "rgba(99, 102, 241, 0.1)",
                            border: "1px dashed rgba(99, 102, 241, 0.4)",
                            color: "var(--accent)",
                            fontSize: "13px",
                            borderRadius: "12px",
                            fontFamily: "var(--font-ui)",
                            fontWeight: 600,
                            cursor: "pointer",
                            transition: "all var(--transition-bounce)"
                        }}
                        onMouseOver={e => { e.currentTarget.style.background = "rgba(99, 102, 241, 0.2)"; e.currentTarget.style.transform = "scale(1.02)"; }}
                        onMouseOut={e => { e.currentTarget.style.background = "rgba(99, 102, 241, 0.1)"; e.currentTarget.style.transform = "scale(1)"; }}
                    >
                        Show all {data.length} rows
                    </button>
                )
            }
        </div >
    );
};

export default ResultsTable;
