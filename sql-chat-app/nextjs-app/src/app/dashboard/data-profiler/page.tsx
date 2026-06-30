"use client";
import React, { useState, useEffect } from "react";

interface ColumnProfile {
    name: string;
    type: string;
    nullCount: number;
    nullPct: number;
    distinctCount: number;
    anomalies: string[];
    min?: number | null;
    max?: number | null;
    avg?: number | null;
    min_date?: string;
    max_date?: string;
    topValues?: { value: string; count: number }[];
}

interface TableProfile {
    tableName: string;
    totalRows: number;
    columns: ColumnProfile[];
}

export default function DataProfilerPage() {
    const [tablesList, setTablesList] = useState<string[]>([]);
    const [selectedTableName, setSelectedTableName] = useState("");
    const [loadingTables, setLoadingTables] = useState(true);
    const [profiling, setProfiling] = useState(false);
    const [profile, setProfile] = useState<TableProfile | null>(null);
    const [errorHeader, setErrorHeader] = useState<string | null>(null);
    const [errorProfile, setErrorProfile] = useState<string | null>(null);

    // Load tables dropdown on mount
    useEffect(() => {
        async function loadTables() {
            try {
                const res = await fetch("/api/schema");
                const data = await res.json();
                if (!res.ok) {
                    throw new Error(data.error || "Failed to introspect SQL schema");
                }
                const names = (data.tables || []).map((t: any) => t.name);
                setTablesList(names);
                if (names.length > 0) {
                    setSelectedTableName(names[0]);
                    handleProfileTable(names[0]);
                }
            } catch (err: any) {
                console.error(err);
                setErrorHeader(err.message || "Failed to fetch tables list.");
            } finally {
                setLoadingTables(false);
            }
        }
        loadTables();
    }, []);

    const handleProfileTable = async (targetTable?: string) => {
        const listTable = targetTable || selectedTableName;
        if (!listTable) return;

        setProfiling(true);
        setErrorProfile(null);
        setProfile(null);

        try {
            const res = await fetch("/api/profile", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ tableName: listTable }),
            });

            const data = await res.json();
            if (!res.ok) {
                throw new Error(data.error || "Failed to profile selected table");
            }

            setProfile(data);
        } catch (err: any) {
            console.error(err);
            setErrorProfile(err.message || "An unexpected error occurred profiling table data.");
        } finally {
            setProfiling(false);
        }
    };

    return (
        <div className="space-y-6 max-w-6xl mx-auto">
            <div className="flex justify-between items-start flex-wrap gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-white mb-1">Data Profiler</h1>
                    <p className="text-gray-400 text-sm">
                        Introspect any table structures to flag anomalies, compute column values distributions, distinct counts, and null percentages.
                    </p>
                </div>

                {/* Database Table selector dropdown */}
                {!loadingTables && tablesList.length > 0 && (
                    <div className="flex items-center gap-3 bg-[var(--bg-surface)] border border-[var(--border)] p-3 rounded-2xl shadow-lg">
                        <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Select Table:</span>
                        <select
                            value={selectedTableName}
                            onChange={(e) => {
                                setSelectedTableName(e.target.value);
                                handleProfileTable(e.target.value);
                            }}
                            disabled={profiling}
                            className="bg-[var(--bg-base)] border border-[var(--border)] text-white text-xs px-3 py-1.5 rounded-lg font-mono focus:outline-none focus:border-[var(--accent)]"
                        >
                            {tablesList.map((name) => (
                                <option key={name} value={name}>
                                    {name}
                                </option>
                            ))}
                        </select>
                        <button
                            onClick={() => handleProfileTable()}
                            disabled={profiling}
                            className="text-xs px-3 py-1.5 rounded-lg bg-[var(--accent)] hover:brightness-110 text-white font-semibold transition-all disabled:opacity-40"
                        >
                            Reload
                        </button>
                    </div>
                )}
            </div>

            {loadingTables && (
                <div className="flex justify-center items-center py-20">
                    <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-indigo-500"></div>
                    <span className="ml-3 text-gray-400 text-sm font-semibold">Cataloging dashboard tables...</span>
                </div>
            )}

            {errorHeader && (
                <div className="bg-red-950/40 border border-red-800 p-4 rounded-xl text-red-300 text-sm">
                    <p className="font-semibold">⚠ Tables Catalogue Fetch Exception</p>
                    <p>{errorHeader}</p>
                </div>
            )}

            {profiling && (
                <div className="flex justify-center items-center py-20 bg-[var(--bg-surface)] border border-[var(--border)] rounded-2xl shadow-xl">
                    <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-[var(--accent)]"></div>
                    <span className="ml-3 text-gray-400 text-sm font-semibold">Running statistical analysis on "{selectedTableName}"...</span>
                </div>
            )}

            {errorProfile && (
                <div className="bg-red-950/40 border border-red-800 p-4 rounded-xl text-red-300 text-sm">
                    <p className="font-semibold">⚠ Table Profiling Exception</p>
                    <p>{errorProfile}</p>
                </div>
            )}

            {profile && !profiling && (
                <div className="space-y-6">
                    {/* Overview Info Cards */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                        <div className="bg-[var(--bg-surface)] border border-[var(--border)] p-5 rounded-2xl shadow-xl space-y-2">
                            <span className="text-xs font-semibold text-gray-500 uppercase tracking-widest block">Table Name</span>
                            <span className="text-xl font-bold text-white font-mono break-all">{profile.tableName}</span>
                        </div>
                        <div className="bg-[var(--bg-surface)] border border-[var(--border)] p-5 rounded-2xl shadow-xl space-y-2">
                            <span className="text-xs font-semibold text-gray-500 uppercase tracking-widest block">Total Records</span>
                            <span className="text-3xl font-extrabold text-indigo-400">{profile.totalRows.toLocaleString()}</span>
                        </div>
                        <div className="bg-[var(--bg-surface)] border border-[var(--border)] p-5 rounded-2xl shadow-xl space-y-2">
                            <span className="text-xs font-semibold text-gray-500 uppercase tracking-widest block">Total Columns</span>
                            <span className="text-3xl font-extrabold text-indigo-400">{profile.columns.length}</span>
                        </div>
                    </div>

                    {/* Detailed Columns Table */}
                    <div className="bg-[var(--bg-surface)] border border-[var(--border)] rounded-2xl p-6 shadow-xl space-y-4">
                        <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-widest border-b border-[var(--border)] pb-3">
                            Column Analytics & Quality Profiles
                        </h3>
                        <div className="overflow-x-auto rounded-xl border border-[var(--border)] bg-[var(--bg-base)]">
                            <table className="w-full text-sm">
                                <thead className="bg-[var(--bg-surface)]">
                                    <tr>
                                        <th className="px-4 py-3 text-left text-gray-400 font-semibold text-xs uppercase tracking-wider">Column</th>
                                        <th className="px-4 py-3 text-left text-gray-400 font-semibold text-xs uppercase tracking-wider">Type</th>
                                        <th className="px-4 py-3 text-center text-gray-400 font-semibold text-xs uppercase tracking-wider">Nulls % (Count)</th>
                                        <th className="px-4 py-3 text-center text-gray-400 font-semibold text-xs uppercase tracking-wider">Distinct Cardinality</th>
                                        <th className="px-4 py-3 text-right text-gray-400 font-semibold text-xs uppercase tracking-wider">Quality Flags</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {profile.columns.map((col) => (
                                        <tr key={col.name} className="border-t border-[var(--border)] hover:bg-[var(--bg-surface)] transition-colors">
                                            <td className="px-4 py-4 text-xs text-white font-semibold font-mono">{col.name}</td>
                                            <td className="px-4 py-4 text-xs text-[#22d3ee] font-mono">{col.type}</td>
                                            <td className="px-4 py-4 text-center">
                                                <div className="flex flex-col items-center">
                                                    <span className="text-xs text-gray-300 font-semibold">{col.nullPct}%</span>
                                                    <span className="text-[10px] text-gray-500">({col.nullCount} nulls)</span>
                                                </div>
                                            </td>
                                            <td className="px-4 py-4 text-center text-xs font-semibold text-gray-300">
                                                {col.distinctCount.toLocaleString()}
                                            </td>
                                            <td className="px-4 py-4 text-right">
                                                {col.anomalies.length > 0 ? (
                                                    <div className="flex flex-wrap gap-1.5 justify-end">
                                                        {col.anomalies.map((anom, i) => (
                                                            <span key={i} className="text-[9px] font-bold px-2 py-0.5 rounded bg-red-950/20 text-[#ef4444] border border-red-900/40">
                                                                {anom}
                                                            </span>
                                                        ))}
                                                    </div>
                                                ) : (
                                                    <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-950/20 text-[#10b981] border border-emerald-900/40 whitespace-nowrap">
                                                        ✓ Quality Standard
                                                    </span>
                                                )}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    {/* Specialized Column Profiles Block */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {profile.columns.some((c) => c.min != null || c.min_date != null) && (
                            <div className="bg-[var(--bg-surface)] border border-[var(--border)] rounded-2xl p-6 shadow-xl space-y-4">
                                <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-widest border-b border-[var(--border)] pb-3">
                                    Numeric & Date Ranges Analytics
                                </h3>
                                <div className="space-y-4 max-h-[350px] overflow-y-auto pr-1">
                                    {profile.columns.map((col) => {
                                        if (col.min != null) {
                                            return (
                                                <div key={col.name} className="p-3 bg-[var(--bg-base)] rounded-xl border border-[var(--border)] space-y-2">
                                                    <span className="text-xs font-bold text-white font-mono">{col.name} ({col.type})</span>
                                                    <div className="grid grid-cols-3 gap-2 text-center text-xs">
                                                        <div className="bg-[var(--bg-surface)] p-1.5 rounded border border-[var(--border)]">
                                                            <span className="text-gray-500 block text-[10px]">MIN</span>
                                                            <span className="font-semibold text-gray-300 font-mono">{col.min.toLocaleString()}</span>
                                                        </div>
                                                        <div className="bg-[var(--bg-surface)] p-1.5 rounded border border-[var(--border)]">
                                                            <span className="text-gray-500 block text-[10px]">AVG</span>
                                                            <span className="font-semibold text-indigo-400 font-mono">{col.avg ? col.avg.toFixed(2) : "—"}</span>
                                                        </div>
                                                        <div className="bg-[var(--bg-surface)] p-1.5 rounded border border-[var(--border)]">
                                                            <span className="text-gray-500 block text-[10px]">MAX</span>
                                                            <span className="font-semibold text-gray-300 font-mono">{col.max != null ? col.max.toLocaleString() : "—"}</span>
                                                        </div>
                                                    </div>
                                                </div>
                                            );
                                        }
                                        if (col.min_date) {
                                            return (
                                                <div key={col.name} className="p-3 bg-[var(--bg-base)] rounded-xl border border-[var(--border)] space-y-2">
                                                    <span className="text-xs font-bold text-white font-mono">{col.name} ({col.type})</span>
                                                    <div className="grid grid-cols-2 gap-2 text-center text-xs">
                                                        <div className="bg-[var(--bg-surface)] p-1.5 rounded border border-[var(--border)]">
                                                            <span className="text-gray-500 block text-[10px]">EARLIEST DATE</span>
                                                            <span className="font-semibold text-gray-300 font-mono text-[10px]">
                                                                {new Date(col.min_date).toLocaleDateString()}
                                                            </span>
                                                        </div>
                                                        <div className="bg-[var(--bg-surface)] p-1.5 rounded border border-[var(--border)]">
                                                            <span className="text-gray-500 block text-[10px]">LATEST DATE</span>
                                                            <span className="font-semibold text-gray-300 font-mono text-[10px]">
                                                                {new Date(col.max_date!).toLocaleDateString()}
                                                            </span>
                                                        </div>
                                                    </div>
                                                </div>
                                            );
                                        }
                                        return null;
                                    })}
                                </div>
                            </div>
                        )}

                        {profile.columns.some((c) => c.topValues && c.topValues.length > 0) && (
                            <div className="bg-[var(--bg-surface)] border border-[var(--border)] rounded-2xl p-6 shadow-xl space-y-4">
                                <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-widest border-b border-[var(--border)] pb-3">
                                    String Columns Top Distributions
                                </h3>
                                <div className="space-y-4 max-h-[350px] overflow-y-auto pr-1">
                                    {profile.columns.map((col) => {
                                        if (col.topValues && col.topValues.length > 0) {
                                            return (
                                                <div key={col.name} className="p-3 bg-[var(--bg-base)] rounded-xl border border-[var(--border)] space-y-2">
                                                    <span className="text-xs font-bold text-white font-mono">{col.name}</span>
                                                    <div className="space-y-1.5">
                                                        {col.topValues.map((v, i) => {
                                                            const pct = profile.totalRows > 0 ? Math.round((v.count / profile.totalRows) * 100) : 0;
                                                            return (
                                                                <div key={i} className="flex items-center justify-between text-xs gap-3">
                                                                    <span className="text-gray-400 truncate max-w-[150px] font-mono">{v.value || "[empty]"}</span>
                                                                    <div className="flex-1 bg-[var(--bg-surface)] h-2.5 rounded-full overflow-hidden border border-[var(--border)] max-w-[150px]">
                                                                        <div className="bg-[var(--accent)] h-full" style={{ width: `${pct}%` }}></div>
                                                                    </div>
                                                                    <span className="text-[10px] text-gray-500 font-semibold whitespace-nowrap">
                                                                        {v.count} ({pct}%)
                                                                    </span>
                                                                </div>
                                                            );
                                                        })}
                                                    </div>
                                                </div>
                                            );
                                        }
                                        return null;
                                    })}
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
