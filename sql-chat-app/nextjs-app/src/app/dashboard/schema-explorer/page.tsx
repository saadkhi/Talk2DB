"use client";
import React, { useState, useEffect } from "react";

interface ColumnInfo {
    name: string;
    type: string;
    nullable: boolean;
    isPrimary: boolean;
}

interface TableInfo {
    name: string;
    rowCount: number;
    columns: ColumnInfo[];
}

export default function SchemaExplorerPage() {
    const [tables, setTables] = useState<TableInfo[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [selectedTable, setSelectedTable] = useState<TableInfo | null>(null);

    useEffect(() => {
        async function loadSchema() {
            try {
                const res = await fetch("/api/schema");
                const data = await res.json();
                if (!res.ok) {
                    throw new Error(data.error || "Failed to introspect SQL schema");
                }
                setTables(data.tables || []);
                if (data.tables && data.tables.length > 0) {
                    setSelectedTable(data.tables[0]);
                }
            } catch (err: any) {
                console.error(err);
                setError(err.message || "Failed to catalog database schema tree.");
            } finally {
                setLoading(false);
            }
        }
        loadSchema();
    }, []);

    return (
        <div className="space-y-6 max-w-6xl mx-auto">
            <div>
                <h1 className="text-2xl font-bold text-white mb-1">Schema Explorer</h1>
                <p className="text-gray-400 text-sm">
                    Browse through your database table trees, primary constraints, data structures, and estimated row counts.
                </p>
            </div>

            {loading && (
                <div className="flex justify-center items-center py-20">
                    <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-indigo-500 border-r-2"></div>
                    <span className="ml-3 text-gray-400 text-sm font-semibold">Introspecting schema...</span>
                </div>
            )}

            {error && (
                <div className="bg-red-950/40 border border-red-800 p-4 rounded-xl text-red-300 text-sm">
                    <p className="font-semibold">⚠ Introspection Exception</p>
                    <p>{error}</p>
                </div>
            )}

            {!loading && !error && tables.length === 0 && (
                <div className="bg-[#1a1d2e] border border-[#2d3154] p-12 text-center text-gray-400 rounded-2xl">
                    <span className="text-4xl block mb-4">🗂️</span>
                    <p className="font-semibold">No Tables Found</p>
                    <p className="text-xs text-gray-500 mt-1">Connect your database or check if it contains base tables in public schema.</p>
                </div>
            )}

            {!loading && !error && tables.length > 0 && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {/* Table List Tree Panel */}
                    <div className="bg-[#1a1d2e] border border-[#2d3154] rounded-2xl p-4 shadow-xl h-[600px] flex flex-col">
                        <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-widest border-b border-[#2d3154] pb-3 mb-3">
                            Tables List ({tables.length})
                        </h3>
                        <div className="flex-1 overflow-y-auto space-y-1.5 pr-1">
                            {tables.map((table) => (
                                <button
                                    key={table.name}
                                    onClick={() => setSelectedTable(table)}
                                    className={`w-full text-left px-3 py-2.5 rounded-xl border text-sm transition-all flex items-center justify-between ${selectedTable?.name === table.name
                                            ? "bg-indigo-600/10 border-indigo-500 text-white font-medium shadow-md shadow-indigo-500/5"
                                            : "border-transparent text-gray-400 hover:bg-[#242840] hover:text-white"
                                        }`}
                                >
                                    <div className="flex items-center gap-2.5 truncate">
                                        <span>🗂️</span>
                                        <span className="truncate font-mono text-xs">{table.name}</span>
                                    </div>
                                    <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-indigo-950 text-indigo-300 border border-indigo-900/60 whitespace-nowrap">
                                        {table.rowCount.toLocaleString()} rows
                                    </span>
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Details Tree Grid Panel */}
                    <div className="bg-[#1a1d2e] border border-[#2d3154] rounded-2xl p-5 shadow-xl md:col-span-2 h-[600px] flex flex-col">
                        {selectedTable ? (
                            <div className="flex flex-col h-full space-y-4">
                                <div className="flex justify-between items-center border-b border-[#2d3154] pb-4">
                                    <div>
                                        <h2 className="text-lg font-bold text-white mb-1 font-mono">{selectedTable.name}</h2>
                                        <p className="text-xs text-indigo-400 font-semibold uppercase tracking-wider">
                                            Table Definition Analysis
                                        </p>
                                    </div>
                                    <span className="text-xs font-semibold text-gray-400 bg-[#0f1117] border border-[#2d3154] px-3 py-1 rounded-lg">
                                        {selectedTable.columns.length} columns in structure
                                    </span>
                                </div>

                                <div className="flex-1 overflow-y-auto rounded-xl border border-[#2d3154] bg-[#0f1117] w-full">
                                    <table className="w-full text-sm">
                                        <thead className="bg-[#1a1d2e] sticky top-0">
                                            <tr>
                                                <th className="px-4 py-3 text-left text-gray-400 font-semibold text-xs uppercase tracking-wider">Column</th>
                                                <th className="px-4 py-3 text-left text-gray-400 font-semibold text-xs uppercase tracking-wider">Type</th>
                                                <th className="px-4 py-3 text-center text-gray-400 font-semibold text-xs uppercase tracking-wider">Nullable</th>
                                                <th className="px-4 py-3 text-right text-gray-400 font-semibold text-xs uppercase tracking-wider">Constraint</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {selectedTable.columns.map((col) => (
                                                <tr key={col.name} className="border-t border-[#2d3154] hover:bg-[#1a1d2e] transition-colors">
                                                    <td className="px-4 py-3.5 text-xs text-white font-semibold font-mono">
                                                        {col.name}
                                                    </td>
                                                    <td className="px-4 py-3.5 text-xs text-[#22d3ee] font-mono">
                                                        {col.type}
                                                    </td>
                                                    <td className="px-4 py-3.5 text-center text-xs">
                                                        {col.nullable ? (
                                                            <span className="text-gray-500 font-medium text-[10px]">NULL</span>
                                                        ) : (
                                                            <span className="text-[#ef4444] font-semibold text-[10px] px-1 py-0.5 rounded bg-red-950/20 border border-red-900/40">NOT NULL</span>
                                                        )}
                                                    </td>
                                                    <td className="px-4 py-3.5 text-right">
                                                        {col.isPrimary ? (
                                                            <span className="text-xs font-semibold px-2.5 py-0.5 rounded bg-amber-950 text-amber-400 border border-amber-900">
                                                                🔑 Primary Key
                                                            </span>
                                                        ) : (
                                                            <span className="text-gray-500 text-xs">—</span>
                                                        )}
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>

                                <div className="flex gap-4">
                                    <div className="flex-1 p-3 bg-indigo-950/20 rounded-xl border border-indigo-900/60 flex items-center justify-between text-xs text-indigo-300">
                                        <span>💡 Profiling Tip: Analyze nulls & anomalies under Data Profiler tool.</span>
                                    </div>
                                </div>
                            </div>
                        ) : (
                            <div className="flex flex-col items-center justify-center h-full text-gray-500 text-sm">
                                <span>Select a table from the sidebar to inspect definitions.</span>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
