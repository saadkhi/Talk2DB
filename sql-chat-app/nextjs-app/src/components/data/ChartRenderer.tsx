"use client";
import React from "react";
import {
    BarChart,
    Bar,
    LineChart,
    Line,
    PieChart,
    Pie,
    Cell,
    AreaChart,
    Area,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    Legend,
    ResponsiveContainer,
} from "recharts";

const COLORS = ["#6366f1", "#22d3ee", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6", "#06b6d4"];

interface ChartRendererProps {
    chartType: "bar" | "line" | "pie" | "area" | "scatter";
    data: any[];
    xKey: string;
    yKeys: string[];
    title?: string;
}

export default function ChartRenderer({ chartType, data, xKey, yKeys, title }: ChartRendererProps) {
    if (!data?.length) return <div className="text-center text-gray-400 py-8">No data to display</div>;

    return (
        <div className="w-full">
            {title && <h3 className="text-lg font-semibold text-white mb-4">{title}</h3>}
            <div className="w-full bg-[#1a1d2e] border border-[#2d3154] p-4 rounded-xl">
                <ResponsiveContainer width="100%" height={350}>
                    {chartType === "pie" ? (
                        <PieChart>
                            <Pie
                                data={data}
                                dataKey={yKeys[0]}
                                nameKey={xKey}
                                cx="50%"
                                cy="50%"
                                outerRadius={100}
                                label={{ fill: '#ffffff', fontSize: 11 }}
                            >
                                {data.map((_, i) => (
                                    <Cell key={i} fill={COLORS[i % COLORS.length]} />
                                ))}
                            </Pie>
                            <Tooltip contentStyle={{ background: "#1a1d2e", border: "1px solid #2d3154", color: "#ffffff" }} />
                            <Legend wrapperStyle={{ color: "#94a3b8" }} />
                        </PieChart>
                    ) : chartType === "line" ? (
                        <LineChart data={data}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#2d3154" />
                            <XAxis dataKey={xKey} stroke="#94a3b8" tick={{ fontSize: 11 }} />
                            <YAxis stroke="#94a3b8" tick={{ fontSize: 11 }} />
                            <Tooltip contentStyle={{ background: "#1a1d2e", border: "1px solid #2d3154", color: "#ffffff" }} />
                            <Legend wrapperStyle={{ color: "#94a3b8" }} />
                            {yKeys.map((key, i) => (
                                <Line
                                    key={key}
                                    type="monotone"
                                    dataKey={key}
                                    stroke={COLORS[i % COLORS.length]}
                                    strokeWidth={2}
                                    dot={{ r: 3 }}
                                    activeDot={{ r: 5 }}
                                />
                            ))}
                        </LineChart>
                    ) : chartType === "area" ? (
                        <AreaChart data={data}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#2d3154" />
                            <XAxis dataKey={xKey} stroke="#94a3b8" tick={{ fontSize: 11 }} />
                            <YAxis stroke="#94a3b8" tick={{ fontSize: 11 }} />
                            <Tooltip contentStyle={{ background: "#1a1d2e", border: "1px solid #2d3154", color: "#ffffff" }} />
                            <Legend wrapperStyle={{ color: "#94a3b8" }} />
                            {yKeys.map((key, i) => (
                                <Area
                                    key={key}
                                    type="monotone"
                                    dataKey={key}
                                    stroke={COLORS[i % COLORS.length]}
                                    fill={COLORS[i % COLORS.length] + "33"}
                                />
                            ))}
                        </AreaChart>
                    ) : (
                        <BarChart data={data}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#2d3154" />
                            <XAxis dataKey={xKey} stroke="#94a3b8" tick={{ fontSize: 11 }} />
                            <YAxis stroke="#94a3b8" tick={{ fontSize: 11 }} />
                            <Tooltip contentStyle={{ background: "#1a1d2e", border: "1px solid #2d3154", color: "#ffffff" }} />
                            <Legend wrapperStyle={{ color: "#94a3b8" }} />
                            {yKeys.map((key, i) => (
                                <Bar
                                    key={key}
                                    dataKey={key}
                                    fill={COLORS[i % COLORS.length]}
                                    radius={[4, 4, 0, 0]}
                                />
                            ))}
                        </BarChart>
                    )}
                </ResponsiveContainer>
            </div>
        </div>
    );
}
