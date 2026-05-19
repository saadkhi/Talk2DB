"use client";
import React, { useState } from "react";
import ChartRenderer from "@/components/data/ChartRenderer";
import DataTable from "@/components/data/DataTable";

const VISUAL_EXAMPLES = [
    "Compare conversation sizes per user in a bar chart",
    "Show email verification ratios in a pie chart",
    "Chart the daily user sign ups in a line chart",
];

export default function DataVisualizerPage() {
    const [prompt, setPrompt] = useState("");
    const [loading, setLoading] = useState(false);
    const [chartConfig, setChartConfig] = useState<{
        chartType: "bar" | "line" | "pie" | "area" | "scatter";
        xKey: string;
        yKeys: string[];
        title?: string;
        sql?: string;
    } | null>(null);
    const [columns, setColumns] = useState<string[]>([]);
    const [data, setData] = useState<any[]>([]);
    const [error, setError] = useState<string | null>(null);

    const handleVisualize = async (e?: React.FormEvent, customPrompt?: string) => {
        if (e) e.preventDefault();
        const activePrompt = customPrompt || prompt;
        if (!activePrompt.trim()) return;

        setLoading(true);
        setError(null);
        setChartConfig(null);
        setColumns([]);
        setData([]);

        try {
            const res = await fetch("/api/visualize", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ prompt: activePrompt }),
            });

            const result = await res.json();
            if (!res.ok) {
                throw new Error(result.error || "Visualization compilation failed");
            }

            setChartConfig({
                chartType: result.chartType,
                xKey: result.xKey,
                yKeys: result.yKeys,
                title: result.title,
                sql: result.sql,
            });
            setColumns(result.columns || []);
            setData(result.data || []);
        } catch (err: any) {
            console.error(err);
            setError(err.message || "An unexpected error occurred compiling the chart.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="space-y-6 max-w-6xl mx-auto">
            <div>
                <h1 className="text-2xl font-bold text-white mb-1">Data Visualizer</h1>
                <p className="text-gray-400 text-sm">
                    Describe the chart you want in plain words. Talk2DB compiles a SQL query, pulls the live data, and plots it interactively.
                </p>
            </div>

            <div className="bg-[#1a1d2e] border border-[#2d3154] p-6 rounded-2xl space-y-4 shadow-xl">
                <form onSubmit={(e) => handleVisualize(e)} className="space-y-4">
                    <div className="flex flex-col gap-2">
                        <label className="text-xs font-semibold text-gray-400 uppercase tracking-widest">
                            Visualization Query Request
                        </label>
                        <textarea
                            placeholder="e.g. Render a line chart showing conversation updates timeline..."
                            value={prompt}
                            onChange={(e) => setPrompt(e.target.value)}
                            disabled={loading}
                            className="bg-[#0f1117] border border-[#2d3154] text-white p-4 rounded-xl text-sm w-full min-h-[90px] focus:outline-none focus:border-indigo-500 transition-all font-sans leading-relaxed"
                            required
                        />
                    </div>

                    <div className="flex justify-between items-center flex-wrap gap-3">
                        <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-xs text-gray-500 font-semibold">Try:</span>
                            {VISUAL_EXAMPLES.map((ex) => (
                                <button
                                    key={ex}
                                    type="button"
                                    onClick={() => {
                                        setPrompt(ex);
                                        handleVisualize(undefined, ex);
                                    }}
                                    disabled={loading}
                                    className="text-xs px-2.5 py-1 rounded bg-[#242840] text-gray-300 hover:text-white border border-[#2d3154] hover:border-indigo-500 transition-all whitespace-nowrap"
                                >
                                    {ex}
                                </button>
                            ))}
                        </div>

                        <button
                            type="submit"
                            disabled={loading}
                            className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-500 disabled:bg-indigo-800 text-white font-semibold rounded-xl text-sm transition-all shadow-lg hover:shadow-indigo-500/20"
                        >
                            {loading ? "Chart Plotting..." : "Render Visualization"}
                        </button>
                    </div>
                </form>
            </div>

            {error && (
                <div className="bg-red-950/40 border border-red-800 p-4 rounded-xl text-red-300 text-sm">
                    <p className="font-semibold">⚠ Visualizer Exception</p>
                    <p>{error}</p>
                </div>
            )}

            {chartConfig && (
                <div className="grid grid-cols-1 gap-6">
                    {/* Chart Renderer Card */}
                    <div className="bg-[#1a1d2e] border border-[#2d3154] rounded-2xl p-6 shadow-xl space-y-4">
                        <ChartRenderer
                            chartType={chartConfig.chartType}
                            data={data}
                            xKey={chartConfig.xKey}
                            yKeys={chartConfig.yKeys}
                            title={chartConfig.title}
                        />
                    </div>

                    {/* Under-the-hood SQL Details */}
                    {chartConfig.sql && (
                        <details className="bg-[#111322] border border-[#2d3154] rounded-2xl p-4 cursor-pointer group">
                            <summary className="text-xs font-semibold text-gray-400 uppercase tracking-widest select-none outline-none flex justify-between items-center">
                                <span>Toggle Generated Compilation Script</span>
                                <span className="text-indigo-400 group-open:rotate-180 transition-transform">▼</span>
                            </summary>
                            <pre className="mt-3 p-4 bg-[#0f1117] rounded-xl text-indigo-300 font-mono text-xs overflow-x-auto border border-[#2d3154] whitespace-pre-wrap cursor-text">
                                {chartConfig.sql}
                            </pre>
                        </details>
                    )}

                    {/* Tabular Dataset Card */}
                    {data.length > 0 && (
                        <div className="bg-[#1a1d2e] border border-[#2d3154] rounded-2xl p-6 shadow-xl space-y-4">
                            <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-widest border-b border-[#2d3154] pb-3">
                                Introspection Raw Dataset ({data.length} records)
                            </h3>
                            <DataTable columns={columns} rows={data} pageSize={10} />
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
