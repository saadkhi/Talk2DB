"use client";
import React from "react";
import {
    BarChart, Bar, LineChart, Line, PieChart, Pie, Cell,
    AreaChart, Area, ScatterChart, Scatter, RadarChart, Radar, PolarGrid,
    PolarAngleAxis, PolarRadiusAxis, RadialBarChart, RadialBar,
    FunnelChart, Funnel, LabelList, Treemap,
    XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
    ComposedChart,
} from "recharts";

export const COLORS = [
    "#6366f1","#22d3ee","#10b981","#f59e0b","#ef4444","#8b5cf6","#06b6d4",
    "#f97316","#84cc16","#ec4899","#14b8a6","#a855f7","#eab308","#3b82f6",
    "#64748b","#d946ef","#0ea5e9","#22c55e","#fb923c","#e11d48",
];

export type ChartType =
    /* Bar family */
    | "bar" | "bar-horizontal" | "bar-stacked" | "bar-stacked-horizontal"
    | "bar-grouped" | "bar-grouped-horizontal" | "bar-negative" | "bar-waterfall"
    /* Line family */
    | "line" | "line-multi" | "line-step" | "line-step-after" | "line-monotone"
    | "line-natural" | "line-basis" | "line-bump"
    /* Area family */
    | "area" | "area-stacked" | "area-stream" | "area-normalized" | "area-step"
    /* Pie / Donut */
    | "pie" | "donut" | "donut-thin" | "pie-multi"
    /* Scatter */
    | "scatter" | "bubble"
    /* Radar */
    | "radar" | "radar-filled" | "radar-multi"
    /* Radial */
    | "radial-bar" | "radial-bar-stacked"
    /* Funnel */
    | "funnel" | "funnel-pyramid"
    /* Treemap */
    | "treemap"
    /* Composed */
    | "combo-bar-line" | "combo-bar-area" | "combo-area-line"
    /* Misc */
    | "histogram" | "gauge" | "heatmap-bar";

export interface ChartRendererProps {
    chartType: ChartType | string;
    data: any[];
    xKey: string;
    yKeys: string[];
    title?: string;
}

const tooltipStyle = {
    background: "#0d0f1a", border: "1px solid rgba(255,255,255,0.1)",
    borderRadius: "8px", color: "#fff", fontSize: "12px",
};
const axisProps = { stroke: "#374151", tick: { fill: "#9CA3AF", fontSize: 11 } };
const gridProps = { strokeDasharray: "3 3", stroke: "rgba(255,255,255,0.06)" };
const legendProps = { wrapperStyle: { color: "#9CA3AF", fontSize: "12px" } };
const margin = { top: 4, right: 8, bottom: 4, left: 0 };

/** Coerce numeric strings to numbers (pg driver quirk) */
function coerce(data: any[], keys: string[]) {
    return data.map(row => {
        const p: any = { ...row };
        for (const k of keys) {
            const v = p[k];
            if (v !== null && v !== undefined && v !== "" && !isNaN(Number(v))) p[k] = Number(v);
        }
        return p;
    });
}

export default function ChartRenderer({ chartType, data, xKey, yKeys, title }: ChartRendererProps) {
    if (!data?.length) return (
        <div style={{ textAlign: "center", color: "#6B7280", padding: "32px 0", fontSize: "13px" }}>
            No data to display
        </div>
    );

    const d = coerce(data, yKeys);
    const y0 = yKeys[0];
    const wrap = (child: React.ReactElement) => (
        <div style={{ width: "100%" }}>
            {title && <h3 style={{ fontSize: "15px", fontWeight: 700, color: "#fff", margin: "0 0 16px", letterSpacing: "-0.02em" }}>{title}</h3>}
            <div style={{ background: "#080a12", border: "1px solid rgba(255,255,255,0.07)", padding: "16px", borderRadius: "12px" }}>
                <ResponsiveContainer width="100%" height={320}>{child}</ResponsiveContainer>
            </div>
        </div>
    );

    /* ── Bar family ── */
    if (chartType === "bar" || chartType === "bar-grouped") return wrap(
        <BarChart data={d} margin={margin}>
            <CartesianGrid {...gridProps}/><XAxis dataKey={xKey} {...axisProps}/><YAxis {...axisProps}/>
            <Tooltip contentStyle={tooltipStyle}/><Legend {...legendProps}/>
            {yKeys.map((k,i)=><Bar key={k} dataKey={k} fill={COLORS[i%COLORS.length]} radius={[4,4,0,0]}/>)}
        </BarChart>
    );
    if (chartType === "bar-horizontal" || chartType === "bar-grouped-horizontal") return wrap(
        <BarChart data={d} layout="vertical" margin={margin}>
            <CartesianGrid {...gridProps}/><XAxis type="number" {...axisProps}/><YAxis dataKey={xKey} type="category" {...axisProps} width={90}/>
            <Tooltip contentStyle={tooltipStyle}/><Legend {...legendProps}/>
            {yKeys.map((k,i)=><Bar key={k} dataKey={k} fill={COLORS[i%COLORS.length]} radius={[0,4,4,0]}/>)}
        </BarChart>
    );
    if (chartType === "bar-stacked") return wrap(
        <BarChart data={d} margin={margin}>
            <CartesianGrid {...gridProps}/><XAxis dataKey={xKey} {...axisProps}/><YAxis {...axisProps}/>
            <Tooltip contentStyle={tooltipStyle}/><Legend {...legendProps}/>
            {yKeys.map((k,i)=><Bar key={k} dataKey={k} stackId="s" fill={COLORS[i%COLORS.length]}/>)}
        </BarChart>
    );
    if (chartType === "bar-stacked-horizontal") return wrap(
        <BarChart data={d} layout="vertical" margin={margin}>
            <CartesianGrid {...gridProps}/><XAxis type="number" {...axisProps}/><YAxis dataKey={xKey} type="category" {...axisProps} width={90}/>
            <Tooltip contentStyle={tooltipStyle}/><Legend {...legendProps}/>
            {yKeys.map((k,i)=><Bar key={k} dataKey={k} stackId="s" fill={COLORS[i%COLORS.length]}/>)}
        </BarChart>
    );
    if (chartType === "bar-negative") return wrap(
        <BarChart data={d} margin={margin}>
            <CartesianGrid {...gridProps}/><XAxis dataKey={xKey} {...axisProps}/><YAxis {...axisProps}/>
            <Tooltip contentStyle={tooltipStyle}/><Legend {...legendProps}/>
            <Bar dataKey={y0} fill={COLORS[0]} radius={[4,4,0,0]}>
                {d.map((row,i)=><Cell key={i} fill={(row[y0]??0)<0?"#ef4444":COLORS[0]}/>)}
            </Bar>
        </BarChart>
    );
    if (chartType === "bar-waterfall" || chartType === "histogram") return wrap(
        <BarChart data={d} margin={margin}>
            <CartesianGrid {...gridProps}/><XAxis dataKey={xKey} {...axisProps}/><YAxis {...axisProps}/>
            <Tooltip contentStyle={tooltipStyle}/>
            {yKeys.map((k,i)=><Bar key={k} dataKey={k} fill={COLORS[i%COLORS.length]} radius={[3,3,0,0]}/>)}
        </BarChart>
    );

    /* ── Line family ── */
    const lineType: any =
        chartType==="line-step"?"step":chartType==="line-step-after"?"stepAfter":
        chartType==="line-natural"?"natural":chartType==="line-basis"?"basis":
        chartType==="line-bump"?"bump":"monotone";

    if (["line","line-multi","line-step","line-step-after","line-monotone","line-natural","line-basis","line-bump"].includes(chartType)) return wrap(
        <LineChart data={d} margin={margin}>
            <CartesianGrid {...gridProps}/><XAxis dataKey={xKey} {...axisProps}/><YAxis {...axisProps}/>
            <Tooltip contentStyle={tooltipStyle}/><Legend {...legendProps}/>
            {yKeys.map((k,i)=><Line key={k} type={lineType} dataKey={k} stroke={COLORS[i%COLORS.length]} strokeWidth={2} dot={{r:3}} activeDot={{r:5}}/>)}
        </LineChart>
    );

    /* ── Area family ── */
    const areaType: any = chartType==="area-step"?"step":"monotone";
    if (chartType==="area"||chartType==="area-step") return wrap(
        <AreaChart data={d} margin={margin}>
            <CartesianGrid {...gridProps}/><XAxis dataKey={xKey} {...axisProps}/><YAxis {...axisProps}/>
            <Tooltip contentStyle={tooltipStyle}/><Legend {...legendProps}/>
            {yKeys.map((k,i)=><Area key={k} type={areaType} dataKey={k} stroke={COLORS[i%COLORS.length]} fill={COLORS[i%COLORS.length]+"28"} strokeWidth={2}/>)}
        </AreaChart>
    );
    if (chartType==="area-stacked") return wrap(
        <AreaChart data={d} margin={margin}>
            <CartesianGrid {...gridProps}/><XAxis dataKey={xKey} {...axisProps}/><YAxis {...axisProps}/>
            <Tooltip contentStyle={tooltipStyle}/><Legend {...legendProps}/>
            {yKeys.map((k,i)=><Area key={k} type="monotone" dataKey={k} stackId="s" stroke={COLORS[i%COLORS.length]} fill={COLORS[i%COLORS.length]+"55"} strokeWidth={2}/>)}
        </AreaChart>
    );
    if (chartType==="area-normalized") return wrap(
        <AreaChart data={d} margin={margin}>
            <CartesianGrid {...gridProps}/><XAxis dataKey={xKey} {...axisProps}/><YAxis tickFormatter={(v:number)=>`${v}%`} {...axisProps}/>
            <Tooltip contentStyle={tooltipStyle}/><Legend {...legendProps}/>
            {yKeys.map((k,i)=><Area key={k} type="monotone" dataKey={k} stackId="s" stroke={COLORS[i%COLORS.length]} fill={COLORS[i%COLORS.length]+"66"} strokeWidth={2}/>)}
        </AreaChart>
    );
    if (chartType==="area-stream") return wrap(
        <AreaChart data={d} margin={margin}>
            <CartesianGrid {...gridProps}/><XAxis dataKey={xKey} {...axisProps}/><YAxis {...axisProps}/>
            <Tooltip contentStyle={tooltipStyle}/><Legend {...legendProps}/>
            {yKeys.map((k,i)=><Area key={k} type="basis" dataKey={k} stackId="s" stroke={COLORS[i%COLORS.length]} fill={COLORS[i%COLORS.length]+"44"} strokeWidth={1.5}/>)}
        </AreaChart>
    );

    /* ── Pie / Donut family ── */
    if (chartType==="pie"||chartType==="pie-multi") return wrap(
        <PieChart>
            <Pie data={d} dataKey={y0} nameKey={xKey} cx="50%" cy="50%" outerRadius={110}
                label={({name,percent}:any)=>(percent??0)>0.03?`${name??""} (${((percent??0)*100).toFixed(0)}%)`:""}
                labelLine={{stroke:"#374151"}}>
                {d.map((_:any,i:number)=><Cell key={i} fill={COLORS[i%COLORS.length]}/>)}
            </Pie>
            <Tooltip contentStyle={tooltipStyle}/><Legend {...legendProps}/>
        </PieChart>
    );
    if (chartType==="donut") return wrap(
        <PieChart>
            <Pie data={d} dataKey={y0} nameKey={xKey} cx="50%" cy="50%" innerRadius={65} outerRadius={110}
                label={({name,percent}:any)=>(percent??0)>0.04?`${name??""} (${((percent??0)*100).toFixed(0)}%)`:""}
                labelLine={{stroke:"#374151"}}>
                {d.map((_:any,i:number)=><Cell key={i} fill={COLORS[i%COLORS.length]}/>)}
            </Pie>
            <Tooltip contentStyle={tooltipStyle}/><Legend {...legendProps}/>
        </PieChart>
    );
    if (chartType==="donut-thin") return wrap(
        <PieChart>
            <Pie data={d} dataKey={y0} nameKey={xKey} cx="50%" cy="50%" innerRadius={85} outerRadius={110} paddingAngle={3}>
                {d.map((_:any,i:number)=><Cell key={i} fill={COLORS[i%COLORS.length]}/>)}
            </Pie>
            <Tooltip contentStyle={tooltipStyle}/><Legend {...legendProps}/>
        </PieChart>
    );

    /* ── Scatter / Bubble ── */
    if (chartType==="scatter"||chartType==="bubble") {
        const zKey = yKeys[1] ?? y0;
        return wrap(
            <ScatterChart margin={margin}>
                <CartesianGrid {...gridProps}/><XAxis dataKey={xKey} type="number" name={xKey} {...axisProps}/><YAxis dataKey={y0} type="number" name={y0} {...axisProps}/>
                <Tooltip contentStyle={tooltipStyle} cursor={{strokeDasharray:"3 3"}}/>
                <Legend {...legendProps}/>
                <Scatter name={y0} data={d.map(r=>({...r,[xKey]:Number(r[xKey])||0}))} fill={COLORS[0]}>
                    {chartType==="bubble"&&d.map((_:any,i:number)=><Cell key={i} fill={COLORS[i%COLORS.length]}/>)}
                </Scatter>
            </ScatterChart>
        );
    }

    /* ── Radar family ── */
    if (chartType==="radar"||chartType==="radar-filled"||chartType==="radar-multi") return wrap(
        <RadarChart cx="50%" cy="50%" outerRadius={110} data={d}>
            <PolarGrid stroke="rgba(255,255,255,0.1)"/>
            <PolarAngleAxis dataKey={xKey} tick={{fill:"#9CA3AF",fontSize:11}}/>
            <PolarRadiusAxis angle={90} tick={{fill:"#6B7280",fontSize:9}}/>
            <Tooltip contentStyle={tooltipStyle}/>
            <Legend {...legendProps}/>
            {yKeys.map((k,i)=>(
                <Radar key={k} name={k} dataKey={k} stroke={COLORS[i%COLORS.length]}
                    fill={COLORS[i%COLORS.length]}
                    fillOpacity={chartType==="radar"?0.12:0.3}
                    strokeWidth={2}/>
            ))}
        </RadarChart>
    );

    /* ── Radial Bar ── */
    if (chartType==="radial-bar"||chartType==="radial-bar-stacked") return wrap(
        <RadialBarChart cx="50%" cy="50%" innerRadius={30} outerRadius={130} barSize={14} data={d}>
            <PolarAngleAxis type="number" domain={[0,'auto']} tick={false}/>
            <RadialBar dataKey={y0} label={{position:"insideStart",fill:"#9CA3AF",fontSize:10}} background={{fill:"rgba(255,255,255,0.03)"}}>
                {d.map((_:any,i:number)=><Cell key={i} fill={COLORS[i%COLORS.length]}/>)}
            </RadialBar>
            <Tooltip contentStyle={tooltipStyle}/>
            <Legend {...legendProps}/>
        </RadialBarChart>
    );

    /* ── Funnel / Pyramid ── */
    if (chartType==="funnel"||chartType==="funnel-pyramid") return wrap(
        <FunnelChart margin={{top:8,right:8,bottom:8,left:8}}>
            <Tooltip contentStyle={tooltipStyle}/>
            <Funnel dataKey={y0} data={d} isAnimationActive>
                <LabelList position="center" fill="#fff" fontSize={11} dataKey={xKey}/>
                {d.map((_:any,i:number)=><Cell key={i} fill={COLORS[i%COLORS.length]}/>)}
            </Funnel>
        </FunnelChart>
    );

    /* ── Treemap ── */
    if (chartType==="treemap") return wrap(
        <Treemap data={d} dataKey={y0} nameKey={xKey} aspectRatio={4/3}
            stroke="#0d0f1a"
            content={(props: any) => {
                const { x, y, width, height, name, value, index } = props;
                return (
                    <g>
                        <rect x={x} y={y} width={width} height={height}
                            style={{ fill: COLORS[(index??0)%COLORS.length], stroke: "#0d0f1a", strokeWidth: 2 }} />
                        {width > 50 && height > 24 && (
                            <text x={x+width/2} y={y+height/2} textAnchor="middle"
                                dominantBaseline="middle" fill="#fff" fontSize={11} fontWeight={600}>
                                {name}
                            </text>
                        )}
                        {width > 50 && height > 40 && (
                            <text x={x+width/2} y={y+height/2+14} textAnchor="middle"
                                dominantBaseline="middle" fill="rgba(255,255,255,0.6)" fontSize={10}>
                                {value}
                            </text>
                        )}
                    </g>
                );
            }}>
            <Tooltip contentStyle={tooltipStyle}/>
        </Treemap>
    );

    /* ── Composed (Combo) charts ── */
    if (chartType==="combo-bar-line") return wrap(
        <ComposedChart data={d} margin={margin}>
            <CartesianGrid {...gridProps}/><XAxis dataKey={xKey} {...axisProps}/><YAxis {...axisProps}/>
            <Tooltip contentStyle={tooltipStyle}/><Legend {...legendProps}/>
            {yKeys.slice(0,Math.ceil(yKeys.length/2)).map((k,i)=><Bar key={k} dataKey={k} fill={COLORS[i%COLORS.length]} radius={[3,3,0,0]} opacity={0.85}/>)}
            {yKeys.slice(Math.ceil(yKeys.length/2)).map((k,i)=><Line key={k} type="monotone" dataKey={k} stroke={COLORS[(i+4)%COLORS.length]} strokeWidth={2} dot={{r:3}}/>)}
        </ComposedChart>
    );
    if (chartType==="combo-bar-area") return wrap(
        <ComposedChart data={d} margin={margin}>
            <CartesianGrid {...gridProps}/><XAxis dataKey={xKey} {...axisProps}/><YAxis {...axisProps}/>
            <Tooltip contentStyle={tooltipStyle}/><Legend {...legendProps}/>
            {yKeys.slice(0,1).map((k,i)=><Bar key={k} dataKey={k} fill={COLORS[i%COLORS.length]} radius={[3,3,0,0]} opacity={0.8}/>)}
            {yKeys.slice(1).map((k,i)=><Area key={k} type="monotone" dataKey={k} stroke={COLORS[(i+3)%COLORS.length]} fill={COLORS[(i+3)%COLORS.length]+"33"} strokeWidth={2}/>)}
        </ComposedChart>
    );
    if (chartType==="combo-area-line") return wrap(
        <ComposedChart data={d} margin={margin}>
            <CartesianGrid {...gridProps}/><XAxis dataKey={xKey} {...axisProps}/><YAxis {...axisProps}/>
            <Tooltip contentStyle={tooltipStyle}/><Legend {...legendProps}/>
            {yKeys.slice(0,1).map((k,i)=><Area key={k} type="monotone" dataKey={k} stroke={COLORS[i%COLORS.length]} fill={COLORS[i%COLORS.length]+"33"} strokeWidth={2}/>)}
            {yKeys.slice(1).map((k,i)=><Line key={k} type="monotone" dataKey={k} stroke={COLORS[(i+2)%COLORS.length]} strokeWidth={2} dot={{r:3}} strokeDasharray="5 3"/>)}
        </ComposedChart>
    );

    /* ── Gauge (single radial arc) ── */
    if (chartType==="gauge") {
        const val = Number(d[0]?.[y0]??0);
        const max = Math.max(...d.map((r:any)=>Number(r[y0]??0)))||100;
        const pct = Math.min(val/max,1);
        const gaugeData = [{name:"value",value:Math.round(pct*100)},{name:"empty",value:100-Math.round(pct*100)}];
        return wrap(
            <PieChart>
                <Pie data={gaugeData} cx="50%" cy="75%" startAngle={180} endAngle={0}
                    innerRadius={70} outerRadius={110} dataKey="value" paddingAngle={2}>
                    <Cell fill={COLORS[0]}/><Cell fill="rgba(255,255,255,0.05)"/>
                </Pie>
                <Tooltip contentStyle={tooltipStyle}/>
            </PieChart>
        );
    }

    /* ── Heatmap-bar (bar with gradient color intensity) ── */
    if (chartType==="heatmap-bar") return wrap(
        <BarChart data={d} margin={margin}>
            <CartesianGrid {...gridProps}/><XAxis dataKey={xKey} {...axisProps}/><YAxis {...axisProps}/>
            <Tooltip contentStyle={tooltipStyle}/>
            <Bar dataKey={y0} radius={[4,4,0,0]}>
                {(()=>{
                    const vals = d.map((r:any)=>Number(r[y0]??0));
                    const mn=Math.min(...vals), mx=Math.max(...vals);
                    return d.map((r:any,i:number)=>{
                        const t=(mx===mn)?0.5:(Number(r[y0]??0)-mn)/(mx-mn);
                        const h=Math.round(240-(t*240)); // blue→red
                        return <Cell key={i} fill={`hsl(${h},70%,55%)`}/>;
                    });
                })()}
            </Bar>
        </BarChart>
    );

    /* ── Default fallback: bar ── */
    return wrap(
        <BarChart data={d} margin={margin}>
            <CartesianGrid {...gridProps}/><XAxis dataKey={xKey} {...axisProps}/><YAxis {...axisProps}/>
            <Tooltip contentStyle={tooltipStyle}/><Legend {...legendProps}/>
            {yKeys.map((k,i)=><Bar key={k} dataKey={k} fill={COLORS[i%COLORS.length]} radius={[4,4,0,0]}/>)}
        </BarChart>
    );
}
