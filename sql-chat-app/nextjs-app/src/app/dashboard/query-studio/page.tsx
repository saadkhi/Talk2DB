"use client";
import React, { useState } from "react";
import DataTable from "@/components/data/DataTable";

const EXAMPLES = [
    "Show the top 10 most recent users",
    "List all conversations with their message counts",
    "Find users who joined in the last 30 days",
    "Count the total number of saved reports per user",
];

export default function QueryStudioPage() {
    const [prompt, setPrompt] = useState("");
    const [loading, setLoading] = useState(false);
    const [sql, setSql] = useState<string | null>(null);
    const [columns, setColumns] = useState<string[]>([]);
    const [rows, setRows] = useState<any[]>([]);
    const [error, setError] = useState<string | null>(null);

    const handleRunQuery = async (e?: React.FormEvent, customPrompt?: string) => {
        if (e) e.preventDefault();
        const queryPrompt = customPrompt || prompt;
        if (!queryPrompt.trim()) return;

        setLoading(true);
        setError(null);
        setSql(null);
        setColumns([]);
        setRows([]);

        try {
            const res = await fetch("/api/query", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ prompt: queryPrompt }),
            });

            const data = await res.json();
            if (!res.ok) {
                throw new Error(data.error || "Query generation or execution failed");
            }

            setSql(data.sql);
            setColumns(data.columns || []);
            setRows(data.rows || []);
        } catch (err: any) {
            console.error(err);
            setError(err.message || "An unexpected error occurred compiles your query.");
            if (err.sql) {
                setSql(err.sql);
            }
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="space-y-6 max-w-6xl mx-auto">
            <div>
                <h1 className="text-2xl font-bold text-white mb-1">Query Studio</h1>
                <p className="text-gray-400 text-sm">
                    Write queries in simple English. Talk2DB translates it to safe SQL and runs it on your database instantly.
                </p>
            </div>

            <div className="bg-[#1a1d2e] border border-[#2d3154] p-6 rounded-2xl space-y-4 shadow-xl">
                <form onSubmit={(e) => handleRunQuery(e)} className="space-y-4">
                    <div className="flex flex-col gap-2">
                        <label className="text-xs font-semibold text-gray-400 uppercase tracking-widest">
                            Natural Language SQL Prompt
                        </label>
                        <textarea
                            placeholder="e.g. Find all users who verified their email and display their names and created dates..."
                            value={prompt}
                            onChange={(e) => setPrompt(e.target.value)}
                            disabled={loading}
                            className="bg-[#0f1117] border border-[#2d3154] text-white p-4 rounded-xl text-sm w-full min-h-[100px] focus:outline-none focus:border-indigo-500 transition-all font-sans leading-relaxed"
                            required
                        />
                    </div>

                    <div className="flex justify-between items-center flex-wrap gap-3">
                        <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-xs text-gray-500 font-semibold">Try:</span>
                            {EXAMPLES.map((ex) => (
                                <button
                                    key={ex}
                                    type="button"
                                    onClick={() => {
                                        setPrompt(ex);
                                        handleRunQuery(undefined, ex);
                                    }}
                                    disabled={loading}
                                    className="text-xs px-2.5 py-1 rounded bg-[#242840] text-gray-300 hover:text-white border border-[#2d3154] hover:border-indigo-500 transition-all whitespace-nowrap"
                                >
                                    {ex.length > 35 ? ex.slice(0, 35) + "..." : ex}
                                </button>
                            ))}
                        </div>

                        <button
                            type="submit"
                            disabled={loading}
                            className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-500 disabled:bg-indigo-800 text-white font-semibold rounded-xl text-sm transition-all shadow-lg hover:shadow-indigo-500/20"
                        >
                            {loading ? "Translating & Running..." : "Execute Query"}
                        </button>
                    </div>
                </form>
            </div>

            {error && (
                <div className="bg-red-950/40 border border-red-800 p-4 rounded-xl text-red-300 text-sm space-y-2">
                    <p className="font-semibold">⚠ Query Compiler Error</p>
                    <p>{error}</p>
                </div>
            )}

            {sql && (
                <div className="bg-[#1a1d2e] border border-[#2d3154] rounded-2xl p-5 space-y-3">
                    <div className="flex justify-between items-center border-b border-[#2d3154] pb-3">
                        <span className="text-xs font-semibold text-gray-400 uppercase tracking-widest">
                            Generated SQL Query
                        </span>
                        <button
                            onClick={() => {
                                navigator.clipboard.writeText(sql);
                                alert("SQL copied to clipboard!");
                            }}
                            className="text-xs px-2 py-1 rounded bg-indigo-950 text-indigo-400 hover:text-white border border-indigo-900 transition-all"
                        >
                            Copy SQL
                        </button>
                    </div>
                    <pre className="p-4 bg-[#0f1117] rounded-xl text-indigo-300 font-mono text-xs overflow-x-auto border border-[#2d3154] whitespace-pre-wrap leading-relaxed">
                        {sql}
                    </pre>
                </div>
            )}

            {rows.length > 0 && (
                <div className="bg-[#1a1d2e] border border-[#2d3154] rounded-2xl p-6 shadow-xl space-y-4">
                    <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-widest border-b border-[#2d3154] pb-3">
                        Compilation Results Dataset
                    </h3>
                    <DataTable columns={columns} rows={rows} pageSize={15} />
                </div>
            )}
        </div>
    );
}
