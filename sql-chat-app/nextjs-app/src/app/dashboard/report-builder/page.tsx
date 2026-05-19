"use client";
import React, { useState } from "react";
import ChartRenderer from "@/components/data/ChartRenderer";
import DataTable from "@/components/data/DataTable";

export default function ReportBuilderPage() {
    const [prompt, setPrompt] = useState("");
    const [loading, setLoading] = useState(false);
    const [narrativeLoading, setNarrativeLoading] = useState(false);

    const [reportData, setReportData] = useState<{
        sql: string;
        columns: string[];
        rows: any[];
        chartConfig: {
            chartType: "bar" | "line" | "pie" | "area" | "scatter";
            xKey: string;
            yKeys: string[];
            title: string;
        };
    } | null>(null);

    const [narrative, setNarrative] = useState<{
        title: string;
        summary: string;
        insights: string[];
        recommendations: string[];
    } | null>(null);

    const [error, setError] = useState<string | null>(null);

    const handleBuildReport = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!prompt.trim()) return;

        setLoading(true);
        setNarrativeLoading(false);
        setError(null);
        setReportData(null);
        setNarrative(null);

        try {
            // Step 1: Fetch primary report data
            const dataRes = await fetch("/api/report", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ prompt }),
            });

            const dataResult = await dataRes.json();
            if (!dataRes.ok) {
                throw new Error(dataResult.error || "Failed to fetch report data datasets");
            }

            setReportData(dataResult);
            setLoading(false);
            setNarrativeLoading(true);

            // Step 2: Fetch narrative AI summary
            const narrativeRes = await fetch("/api/report/narrative", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    prompt,
                    columns: dataResult.columns,
                    sampleRows: dataResult.rows,
                }),
            });

            const narrativeResult = await narrativeRes.json();
            if (!narrativeRes.ok) {
                throw new Error(narrativeResult.error || "Failed compiling report narrative");
            }

            setNarrative(narrativeResult);
        } catch (err: any) {
            console.error(err);
            setError(err.message || "Failed compiling automated reports dashboard.");
        } finally {
            setLoading(false);
            setNarrativeLoading(false);
        }
    };

    return (
        <div className="space-y-6 max-w-6xl mx-auto">
            <div>
                <h1 className="text-2xl font-bold text-white mb-1">Corporate Report Builder</h1>
                <p className="text-gray-400 text-sm">
                    Compile complete executive analytics: live query datasets, interactive charting, AI-driven summaries, and strategic insights.
                </p>
            </div>

            <div className="bg-[#1a1d2e] border border-[#2d3154] p-6 rounded-2xl space-y-4 shadow-xl">
                <form onSubmit={handleBuildReport} className="space-y-4">
                    <div className="flex flex-col gap-2">
                        <label className="text-xs font-semibold text-gray-400 uppercase tracking-widest">
                            Report Subject & Target Subject Guidelines
                        </label>
                        <textarea
                            placeholder="e.g. Write an active overview of registered users. Compile user counts timeline and email status metrics..."
                            value={prompt}
                            onChange={(e) => setPrompt(e.target.value)}
                            disabled={loading || narrativeLoading}
                            className="bg-[#0f1117] border border-[#2d3154] text-white p-4 rounded-xl text-sm w-full min-h-[90px] focus:outline-none focus:border-indigo-500 transition-all font-sans leading-relaxed"
                            required
                        />
                    </div>

                    <div className="flex justify-end">
                        <button
                            type="submit"
                            disabled={loading || narrativeLoading}
                            className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-500 disabled:bg-indigo-800 text-white font-semibold rounded-xl text-sm transition-all shadow-lg hover:shadow-indigo-500/20"
                        >
                            {loading
                                ? "Compiling Datasets..."
                                : narrativeLoading
                                    ? "Generating AI Narrative..."
                                    : "Compile Complete Report"}
                        </button>
                    </div>
                </form>
            </div>

            {error && (
                <div className="bg-red-950/40 border border-red-800 p-4 rounded-xl text-red-300 text-sm">
                    <p className="font-semibold">⚠ Report Generation Exception</p>
                    <p>{error}</p>
                </div>
            )}

            {/* Main Report Dashboard */}
            {reportData && (
                <div className="space-y-6">
                    {/* Header Card with Loader for AI narrative */}
                    <div className="bg-[#1a1d2e] border border-[#2d3154] rounded-2xl p-6 shadow-xl space-y-4">
                        <div className="border-b border-[#2d3154] pb-4 flex justify-between items-start flex-wrap gap-3">
                            <div>
                                <h2 className="text-xl font-bold text-white mb-1">
                                    {narrative?.title || "Introspective Data Report"}
                                </h2>
                                <p className="text-xs text-indigo-400 font-semibold uppercase tracking-wider">
                                    Automated Analyst Dashboard
                                </p>
                            </div>
                            <span className="text-[10px] font-semibold px-2 py-1 rounded bg-[#10b981]/15 text-[#10b981] border border-[#10b981]/30">
                                Live Postgres Compiled
                            </span>
                        </div>

                        {/* Executive Summary block */}
                        {narrativeLoading && (
                            <div className="flex items-center gap-3 py-6 justify-center text-gray-400 text-sm">
                                <div className="animate-spin rounded-full h-5 w-5 border-t-2 border-indigo-500"></div>
                                <span>Compiling AI analysis highlights...</span>
                            </div>
                        )}

                        {narrative && (
                            <div className="p-4 bg-indigo-950/15 border border-indigo-500/30 rounded-xl space-y-2">
                                <h4 className="text-xs font-bold text-indigo-300 uppercase tracking-widest">
                                    Executive Summary
                                </h4>
                                <p className="text-sm text-gray-200 leading-relaxed font-sans">{narrative.summary}</p>
                            </div>
                        )}
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        {/* Chart Block (2/3 width) */}
                        <div className="md:col-span-2 bg-[#1a1d2e] border border-[#2d3154] rounded-2xl p-5 shadow-xl">
                            <ChartRenderer
                                chartType={reportData.chartConfig.chartType}
                                data={reportData.rows}
                                xKey={reportData.chartConfig.xKey}
                                yKeys={reportData.chartConfig.yKeys}
                                title={reportData.chartConfig.title}
                            />
                        </div>

                        {/* AI Insights & Actions (1/3 width) */}
                        <div className="bg-[#1a1d2e] border border-[#2d3154] rounded-2xl p-5 shadow-xl flex flex-col justify-between">
                            <div className="space-y-4">
                                <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-widest border-b border-[#2d3154] pb-3">
                                    AI Analytics Insights
                                </h3>
                                {narrativeLoading && (
                                    <div className="animate-pulse space-y-2">
                                        <div className="h-3 bg-[#242840] rounded w-3/4"></div>
                                        <div className="h-3 bg-[#242840] rounded w-5/6"></div>
                                        <div className="h-3 bg-[#242840] rounded w-2/3"></div>
                                    </div>
                                )}
                                {narrative && (
                                    <ul className="space-y-2.5 text-xs text-gray-300 list-disc pl-4 font-sans leading-relaxed">
                                        {narrative.insights.map((ins, i) => (
                                            <li key={i}>{ins}</li>
                                        ))}
                                    </ul>
                                )}
                            </div>

                            <div className="space-y-4 mt-6">
                                <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-widest border-b border-[#2d3154] pb-3">
                                    Strategic Recommendations
                                </h3>
                                {narrativeLoading && (
                                    <div className="animate-pulse space-y-2">
                                        <div className="h-3 bg-[#242840] rounded w-4/5"></div>
                                        <div className="h-3 bg-[#242840] rounded w-3/4"></div>
                                    </div>
                                )}
                                {narrative && (
                                    <ul className="space-y-2.5 text-xs text-gray-300 list-disc pl-4 font-sans leading-relaxed">
                                        {narrative.recommendations.map((rec, i) => (
                                            <li key={i} className="text-[#10b981]">
                                                {rec}
                                            </li>
                                        ))}
                                    </ul>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Under-the-hood SQL Details */}
                    <details className="bg-[#111322] border border-[#2d3154] rounded-2xl p-4 cursor-pointer group">
                        <summary className="text-xs font-semibold text-gray-400 uppercase tracking-widest select-none outline-none flex justify-between items-center">
                            <span>Introspect Automated Compilation SQL</span>
                            <span className="text-indigo-400 group-open:rotate-180 transition-transform">▼</span>
                        </summary>
                        <pre className="mt-3 p-4 bg-[#0f1117] rounded-xl text-indigo-300 font-mono text-xs overflow-x-auto border border-[#2d3154] whitespace-pre-wrap cursor-text">
                            {reportData.sql}
                        </pre>
                    </details>

                    {/* Table (Full width) */}
                    <div className="bg-[#1a1d2e] border border-[#2d3154] rounded-2xl p-6 shadow-xl space-y-4">
                        <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-widest border-b border-[#2d3154] pb-3">
                            Introspection Data Table ({reportData.rows.length} records)
                        </h3>
                        <DataTable columns={reportData.columns} rows={reportData.rows} pageSize={10} />
                    </div>
                </div>
            )}
        </div>
    );
}
