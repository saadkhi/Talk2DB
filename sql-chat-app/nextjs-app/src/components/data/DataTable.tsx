"use client";
import React, { useState } from "react";

interface DataTableProps {
    columns: string[];
    rows: any[];
    pageSize?: number;
}

export default function DataTable({ columns, rows, pageSize = 25 }: DataTableProps) {
    const [page, setPage] = useState(0);
    const [sortCol, setSortCol] = useState<string | null>(null);
    const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");

    if (!columns || !columns.length) {
        return <div className="text-center text-gray-400 py-8">No columns to display</div>;
    }

    const sorted = sortCol ? [...rows].sort((a, b) => {
        const av = a[sortCol];
        const bv = b[sortCol];
        if (av == null) return 1;
        if (bv == null) return -1;

        // Check if numeric sorting
        const aNum = Number(av);
        const bNum = Number(bv);
        if (!isNaN(aNum) && !isNaN(bNum)) {
            return sortDir === "asc" ? aNum - bNum : bNum - aNum;
        }

        // String sorting
        const aStr = String(av).toLowerCase();
        const bStr = String(bv).toLowerCase();
        return sortDir === "asc"
            ? (aStr > bStr ? 1 : -1)
            : (aStr < bStr ? 1 : -1);
    }) : rows;

    const paged = sorted.slice(page * pageSize, (page + 1) * pageSize);
    const totalPages = Math.ceil(rows.length / pageSize);

    const downloadCSV = () => {
        const csv = [
            columns.join(","),
            ...rows.map(r => columns.map(c => JSON.stringify(r[c] ?? "")).join(","))
        ].join("\n");
        const blob = new Blob([csv], { type: "text/csv" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = "data.csv";
        a.click();
    };

    return (
        <div>
            <div className="flex justify-between items-center mb-4">
                <span className="text-sm text-gray-400">{rows.length} rows</span>
                <button
                    onClick={downloadCSV}
                    className="text-xs px-3 py-1.5 bg-indigo-600 rounded-lg text-white hover:bg-indigo-500 font-semibold transition-all"
                >
                    Download CSV
                </button>
            </div>
            <div className="overflow-x-auto rounded-xl border border-[#2d3154]">
                <table className="w-full text-sm">
                    <thead className="bg-[#1a1d2e]">
                        <tr>
                            {columns.map(col => (
                                <th
                                    key={col}
                                    onClick={() => {
                                        if (sortCol === col) {
                                            setSortDir(s => s === "asc" ? "desc" : "asc");
                                        } else {
                                            setSortCol(col);
                                            setSortDir("asc");
                                        }
                                    }}
                                    className="px-4 py-3 text-left text-gray-300 font-semibold cursor-pointer hover:text-white hover:bg-[#242840] whitespace-nowrap transition-colors"
                                >
                                    {col} {sortCol === col ? (sortDir === "asc" ? " ↑" : " ↓") : ""}
                                </th>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        {!paged.length ? (
                            <tr>
                                <td colSpan={columns.length} className="text-center text-gray-500 py-8">
                                    No records found
                                </td>
                            </tr>
                        ) : (
                            paged.map((row, i) => (
                                <tr key={i} className="border-t border-[#2d3154] hover:bg-[#1a1d2e] transition-colors">
                                    {columns.map(col => (
                                        <td key={col} className="px-4 py-2.5 text-gray-300 max-w-xs truncate font-mono text-xs">
                                            {row[col] == null ? <span className="text-gray-600 italic">null</span> : String(row[col])}
                                        </td>
                                    ))}
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>
            {totalPages > 1 && (
                <div className="flex justify-center items-center gap-4 mt-4">
                    <button
                        onClick={() => setPage(p => Math.max(0, p - 1))}
                        disabled={page === 0}
                        className="px-3 py-1.5 rounded-lg bg-[#1a1d2e] border border-[#2d3154] text-gray-300 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-[#242840] text-xs font-semibold transition-all"
                    >
                        ← Prev
                    </button>
                    <span className="text-gray-400 text-xs font-semibold">
                        {page + 1} / {totalPages}
                    </span>
                    <button
                        onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))}
                        disabled={page === totalPages - 1}
                        className="px-3 py-1.5 rounded-lg bg-[#1a1d2e] border border-[#2d3154] text-gray-300 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-[#242840] text-xs font-semibold transition-all"
                    >
                        Next →
                    </button>
                </div>
            )}
        </div>
    );
}
