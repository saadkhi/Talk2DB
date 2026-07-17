"use client";
import React from "react";
import {
    BarChart, Bar, LineChart, Line, PieChart, Pie, Cell,
    AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
    Legend, ResponsiveContainer,
} from "recharts";

const COLORS = ["#6366f1", "#22d3ee", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6", "#06b6d4"];

interface ChartRendererProps {
    chartType: "bar" | "line" | "pie" | "area" | "scatter";
    data: any[];
    xKey: string;
    yKeys: string[];
    title?: string;
}

const tooltipStyle = {
    background: "#0d0f1a",
    border: "1px solid rgba(255,255,255,0.1)",
    borderRadius: "8px",
    color: "#fff",
    fontSize: "12px",
};

export default function ChartRenderer({ chartType, data, xKey, yKeys, title }: ChartRendererProps) {
    if (!data?.length) {
        return (
            <div style={{ textAlign: "center", color: "#6B7280", padding: "32px 0", fontSize: "13px" }}>
                No data to display
            </div>
        );
    }

    const axisProps = {
        stroke: "#374151",
        tick: { fill: "#9CA3AF", fontSize: 11 },
    };
    const gridProps = { strokeDasharray: "3 3", stroke: "rgba(255,255,255,0.06)" };
    const legendProps = { wrapperStyle: { color: "#9CA3AF", fontSize: "12px" } };

    return (
        <div style={{ width: "100%" }}>
            {title && (
                <h3 style={{ fontSize: "15px", fontWeight: 700, color: "#fff", margin: "0 0 16px", letterSpacing: "-0.02em" }}>
                    {title}
                </h3>
            )}
            <div style={{
                width: "100%", background: "#080a12",
                border: "1px solid rgba(255,255,255,0.07)",
                padding: "16px", borderRadius: "12px",
            }}>
                <ResponsiveContainer width="100%" height={320}>
                    {chartType === "pie" ? (
                        <PieChart>
                            <Pie data={data} dataKey={yKeys[0]} nameKey={xKey}
                                cx="50%" cy="50%" outerRadius={110}
                                label={({ name, percent }: { name?: string; percent?: number }) =>
                                    `${name ?? ""} (${(( percent ?? 0) * 100).toFixed(0)}%)`
                                }
                                labelLine={{ stroke: "#374151" }}
                            >
                                {data.map((_, i) => (
                                    <Cell key={i} fill={COLORS[i % COLORS.length]} />
                                ))}
                            </Pie>
                            <Tooltip contentStyle={tooltipStyle} />
                            <Legend {...legendProps} />
                        </PieChart>
                    ) : chartType === "line" ? (
                        <LineChart data={data} margin={{ top: 4, right: 8, bottom: 4, left: 0 }}>
                            <CartesianGrid {...gridProps} />
                            <XAxis dataKey={xKey} {...axisProps} />
                            <YAxis {...axisProps} />
                            <Tooltip contentStyle={tooltipStyle} />
                            <Legend {...legendProps} />
                            {yKeys.map((key, i) => (
                                <Line key={key} type="monotone" dataKey={key}
                                    stroke={COLORS[i % COLORS.length]} strokeWidth={2}
                                    dot={{ r: 3, fill: COLORS[i % COLORS.length] }}
                                    activeDot={{ r: 5 }}
                                />
                            ))}
                        </LineChart>
                    ) : chartType === "area" ? (
                        <AreaChart data={data} margin={{ top: 4, right: 8, bottom: 4, left: 0 }}>
                            <CartesianGrid {...gridProps} />
                            <XAxis dataKey={xKey} {...axisProps} />
                            <YAxis {...axisProps} />
                            <Tooltip contentStyle={tooltipStyle} />
                            <Legend {...legendProps} />
                            {yKeys.map((key, i) => (
                                <Area key={key} type="monotone" dataKey={key}
                                    stroke={COLORS[i % COLORS.length]}
                                    fill={COLORS[i % COLORS.length] + "28"}
                                    strokeWidth={2}
                                />
                            ))}
                        </AreaChart>
                    ) : (
                        /* default: bar */
                        <BarChart data={data} margin={{ top: 4, right: 8, bottom: 4, left: 0 }}>
                            <CartesianGrid {...gridProps} />
                            <XAxis dataKey={xKey} {...axisProps} />
                            <YAxis {...axisProps} />
                            <Tooltip contentStyle={tooltipStyle} />
                            <Legend {...legendProps} />
                            {yKeys.map((key, i) => (
                                <Bar key={key} dataKey={key}
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
