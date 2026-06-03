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
        <div style={{ width: "100%", overflow: "hidden" }}>
            <div style={{
                maxHeight: "280px",
                overflowY: "auto",
                border: "1px solid var(--border)",
                borderRadius: "8px",
                background: "var(--bg-surface)"
            }}>
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "13px" }}>
                    <thead style={{ position: "sticky", top: 0, background: "var(--bg-elevated)", zIndex: 1 }}>
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
                                background: i % 2 === 0 ? "var(--bg-surface)" : "transparent",
                                height: "36px"
                            }}>
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
                            marginTop: "12px",
                            width: "100%",
                            padding: "8px",
                            background: "var(--bg-elevated)",
                            color: "var(--accent)",
                            fontSize: "12px",
                            borderRadius: "6px",
                            fontFamily: "var(--font-ui)",
                            fontWeight: 500
                        }}
                    >
                        Show all {data.length} rows
                    </button>
                )
            }
        </div >
    );
};

export default ResultsTable;
