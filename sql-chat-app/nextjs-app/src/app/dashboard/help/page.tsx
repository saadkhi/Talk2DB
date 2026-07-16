"use client";
import React, { useState } from "react";
import Link from "next/link";

/* ── Design tokens ────────────────────────────────────────── */
const card: React.CSSProperties = {
    background: "#0d0f1a",
    border: "1px solid rgba(255,255,255,0.08)",
    borderRadius: "14px",
};

/* ── Data ─────────────────────────────────────────────────── */
const TOOLS = [
    {
        href: "/dashboard/query-studio",
        title: "Query Studio",
        accent: "#6366f1",
        icon: (
            <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M17.25 6.75L22.5 12l-5.25 5.25m-10.5 0L1.5 12l5.25-5.25m7.5-3l-4.5 16.5" />
            </svg>
        ),
        description: "Translate plain-English questions into PostgreSQL SELECT queries and see the results instantly.",
        steps: [
            "Type your question in the prompt box (e.g. \"Show me the top 10 users by message count\")",
            "Click Execute Query — Talk2DB generates and runs safe SQL",
            "Inspect the generated SQL or copy it to your clipboard",
            "Export results as CSV or JSON using the buttons in the results table",
        ],
        tips: [
            "Be specific — mention table names if you know them",
            "Use the example chips to get started quickly",
            "Click a column header in the results to sort",
        ],
    },
    {
        href: "/dashboard/data-visualizer",
        title: "Data Visualizer",
        accent: "#3b82f6",
        icon: (
            <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M7.5 14.25v2.25m3-4.5v4.5m3-6.75v6.75m3-9v9M6 20.25h12A2.25 2.25 0 0020.25 18V6A2.25 2.25 0 0018 3.75H6A2.25 2.25 0 003.75 6v12A2.25 2.25 0 006 20.25z" />
            </svg>
        ),
        description: "Describe the chart you want and Talk2DB picks the chart type, writes the SQL, and renders it.",
        steps: [
            "Describe your chart (e.g. \"Bar chart of daily signups over the last 30 days\")",
            "Click Render Chart — the AI generates SQL + chart configuration",
            "Expand the Generated SQL section to see the query",
            "The raw data table is shown below the chart for reference",
        ],
        tips: [
            "Mention chart type (bar, line, pie, area) for best results",
            "Specify time ranges like \"last 7 days\" or \"this month\"",
            "The AI auto-picks X and Y axes — you can re-prompt to adjust",
        ],
    },
    {
        href: "/dashboard/schema-explorer",
        title: "Schema Explorer",
        accent: "#f59e0b",
        icon: (
            <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M20.25 6.375c0 2.278-3.694 4.125-8.25 4.125S3.75 8.653 3.75 6.375m16.5 0c0-2.278-3.694-4.125-8.25-4.125S3.75 4.097 3.75 6.375m16.5 0v11.25c0 2.278-3.694 4.125-8.25 4.125s-8.25-1.847-8.25-4.125V6.375m16.5 2.625c0 2.278-3.694 4.125-8.25 4.125s-8.25-1.847-8.25-4.125" />
            </svg>
        ),
        description: "Browse all tables, inspect column definitions, data types, nullability and primary key constraints.",
        steps: [
            "Click any table in the left sidebar to inspect it",
            "Use the search box to filter tables by name",
            "The detail panel shows column names, data types, nullable status, and constraints",
            "Row count is shown for each table in the sidebar",
        ],
        tips: [
            "🔑 marks Primary Key columns",
            "NOT NULL columns are shown in red",
            "Use this to learn your schema before writing queries",
        ],
    },
    {
        href: "/dashboard/report-builder",
        title: "Report Builder",
        accent: "#10b981",
        icon: (
            <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
            </svg>
        ),
        description: "Generate executive-quality reports with SQL data, charts, AI summaries and strategic insights in one click.",
        steps: [
            "Describe the report subject (e.g. \"Monthly revenue by product category for Q1\")",
            "Click Compile Report — generates SQL, fetches data and renders the chart",
            "The AI then generates an executive summary and strategic insights",
            "Click Save Report to persist it — view saved reports under Saved Queries",
        ],
        tips: [
            "More specific prompts produce better insights",
            "The AI generates PostgreSQL SQL — make sure your schema is connected",
            "Saved reports include SQL, summary and insights for future reference",
        ],
    },
    {
        href: "/dashboard/data-profiler",
        title: "Data Profiler",
        accent: "#8b5cf6",
        icon: (
            <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h3.75M9 15h3.75m-7.5 6H18a2.25 2.25 0 002.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 00-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 00.75-.75 2.25 2.25 0 00-.1-.664m-5.8 0A2.251 2.251 0 0113.5 2.25H15c1.012 0 1.867.668 2.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m8.9-4.414c.376.023.75.05 1.124.08 1.131.094 1.976 1.057 1.976 2.192V16.5A2.25 2.25 0 0118 18.75h-2.25m-7.5-10.5H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V18.75m-7.5-10.5h6.375c.621 0 1.125.504 1.125 1.125V18.75" />
            </svg>
        ),
        description: "Run statistical analysis on any table to detect anomalies, null rates, cardinality and value distributions.",
        steps: [
            "Select a table from the dropdown at the top",
            "The profiler runs automatically and shows null %, distinct count, and anomaly flags",
            "Numeric columns show MIN / AVG / MAX statistics",
            "String columns show top 5 most common values with frequency bars",
        ],
        tips: [
            "Red flags mean High Null % (>50%) or Single Cardinality",
            "✓ Clean means no anomalies detected in that column",
            "Click Reload to refresh the profile after data changes",
        ],
    },
];

const FAQS = [
    {
        q: "How do I connect my database?",
        a: "Click the 'Not Connected' pill in the top bar or go to Settings → Database Connection. Paste your PostgreSQL connection string. Talk2DB tests the connection before saving it — it's encrypted with AES-256 at rest.",
    },
    {
        q: "Which databases are supported?",
        a: "PostgreSQL is fully supported (including Neon, Supabase, Railway, AWS RDS, and local instances). MySQL and SQLite are available via the dialect selector but are in preview — some AI-generated SQL may need minor adjustments.",
    },
    {
        q: "Is my database connection string safe?",
        a: "Yes. Your connection string is encrypted with AES-256 before being stored. It is never logged, never sent to third-party AI providers, and is only decrypted server-side on your own instance when executing queries.",
    },
    {
        q: "Why is the AI generating wrong SQL?",
        a: "This usually happens when the schema context is missing. Make sure your database is connected — Talk2DB fetches your real table and column names to give the AI accurate context. Also try being more specific in your prompt.",
    },
    {
        q: "What AI models does Talk2DB use?",
        a: "Talk2DB uses a fine-tuned Gradio model (saadkhi/SQL_chatbot_API) as the primary SQL generator, with OpenRouter (meta-llama/llama-3.3-70b-instruct:free) as the fallback. Make sure OPENROUTER_API_KEY is set in your .env.",
    },
    {
        q: "How do I export query results?",
        a: "Every results table has CSV and JSON export buttons in the top-right corner. Click CSV to download a spreadsheet-compatible file, or JSON to download structured data for use in other tools.",
    },
    {
        q: "Where are my saved reports?",
        a: "Go to Saved Queries in the left sidebar. Every report you save from the Report Builder (using the Save Report button) appears there with its SQL, executive summary, and insights.",
    },
    {
        q: "How do I view my chat history?",
        a: "Click History in the left sidebar. All past AI conversations are listed with timestamps. Click View on any conversation to expand the full message thread. You can also delete individual conversations.",
    },
];

export default function HelpPage() {
    const [openFaq, setOpenFaq] = useState<number | null>(null);
    const [activeTab, setActiveTab] = useState<"tools" | "faq" | "quickstart">("quickstart");

    return (
        <div style={{ maxWidth: "900px", margin: "0 auto", display: "flex", flexDirection: "column", gap: "28px", width: "100%" }}>

            {/* Header */}
            <div>
                <h1 style={{ fontSize: "22px", fontWeight: 800, color: "#fff", margin: "0 0 4px", letterSpacing: "-0.03em" }}>Help & Documentation</h1>
                <p style={{ fontSize: "13px", color: "#6B7280", margin: 0 }}>Everything you need to get the most out of Talk2DB.</p>
            </div>

            {/* Tab bar */}
            <div style={{ display: "flex", gap: "4px", background: "#0d0f1a", border: "1px solid rgba(255,255,255,0.08)", borderRadius: "10px", padding: "4px" }}>
                {(["quickstart", "tools", "faq"] as const).map(tab => {
                    const labels = { quickstart: "Quick Start", tools: "Tool Guides", faq: "FAQ" };
                    const active = activeTab === tab;
                    return (
                        <button key={tab} onClick={() => setActiveTab(tab)} style={{
                            flex: 1, padding: "9px 0", borderRadius: "8px", fontSize: "13px", fontWeight: 600,
                            background: active ? "rgba(99,102,241,0.15)" : "transparent",
                            border: active ? "1px solid rgba(99,102,241,0.3)" : "1px solid transparent",
                            color: active ? "#a5b4fc" : "#6B7280", cursor: "pointer", transition: "all 0.15s",
                        }}>
                            {labels[tab]}
                        </button>
                    );
                })}
            </div>

            {/* ── Quick Start ── */}
            {activeTab === "quickstart" && (
                <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                    <div style={{ ...card, padding: "24px 28px" }}>
                        <h2 style={{ fontSize: "16px", fontWeight: 800, color: "#fff", margin: "0 0 20px", letterSpacing: "-0.02em" }}>
                            Get up and running in 3 steps
                        </h2>
                        <div style={{ display: "flex", flexDirection: "column", gap: "0" }}>
                            {[
                                { n: "1", title: "Connect your database", body: "Click the status pill in the top bar or go to Settings. Paste your PostgreSQL connection string. Talk2DB tests and encrypts it automatically.", color: "#6366f1", link: "/dashboard/settings", cta: "Open Settings" },
                                { n: "2", title: "Ask a question", body: "Go to Query Studio and type a question in plain English — e.g. \"Show me the 10 most recent users\". Talk2DB will generate and run the SQL.", color: "#3b82f6", link: "/dashboard/query-studio", cta: "Open Query Studio" },
                                { n: "3", title: "Explore more tools", body: "Visualize data as charts, explore your schema, profile tables for data quality, or generate full executive reports.", color: "#10b981", link: "/dashboard", cta: "Go to Dashboard" },
                            ].map((step, i, arr) => (
                                <div key={step.n} style={{ display: "flex", gap: "20px", paddingBottom: i < arr.length - 1 ? "24px" : 0, marginBottom: i < arr.length - 1 ? "24px" : 0, borderBottom: i < arr.length - 1 ? "1px solid rgba(255,255,255,0.05)" : "none" }}>
                                    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 0, flexShrink: 0 }}>
                                        <div style={{ width: "32px", height: "32px", borderRadius: "50%", background: `${step.color}20`, border: `2px solid ${step.color}50`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "14px", fontWeight: 800, color: step.color }}>{step.n}</div>
                                        {i < arr.length - 1 && <div style={{ width: "1px", flex: 1, background: "rgba(255,255,255,0.06)", marginTop: "6px" }} />}
                                    </div>
                                    <div style={{ flex: 1, paddingTop: "4px" }}>
                                        <p style={{ fontSize: "14px", fontWeight: 700, color: "#fff", margin: "0 0 6px" }}>{step.title}</p>
                                        <p style={{ fontSize: "13px", color: "#9CA3AF", lineHeight: 1.65, margin: "0 0 12px" }}>{step.body}</p>
                                        <Link href={step.link} style={{
                                            display: "inline-flex", alignItems: "center", gap: "6px",
                                            fontSize: "12px", fontWeight: 700, color: step.color,
                                            background: `${step.color}12`, border: `1px solid ${step.color}30`,
                                            padding: "6px 14px", borderRadius: "7px", textDecoration: "none",
                                        }}>
                                            {step.cta} →
                                        </Link>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Feature highlights */}
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: "12px" }}>
                        {[
                            { icon: "🔒", title: "AES-256 Encryption", body: "Connection strings are encrypted before storage." },
                            { icon: "⚡", title: "Rate Limited", body: "Endpoints are rate-limited to prevent abuse." },
                            { icon: "🛡️", title: "SELECT Only", body: "The SQL safety layer blocks all mutating queries." },
                            { icon: "📊", title: "Live Data", body: "All charts and tables use real-time query results." },
                        ].map(f => (
                            <div key={f.title} style={{ ...card, padding: "16px 18px" }}>
                                <p style={{ fontSize: "22px", margin: "0 0 8px" }}>{f.icon}</p>
                                <p style={{ fontSize: "13px", fontWeight: 700, color: "#fff", margin: "0 0 4px" }}>{f.title}</p>
                                <p style={{ fontSize: "12px", color: "#6B7280", margin: 0, lineHeight: 1.55 }}>{f.body}</p>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* ── Tool Guides ── */}
            {activeTab === "tools" && (
                <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                    {TOOLS.map(tool => (
                        <div key={tool.href} style={card}>
                            {/* Tool header */}
                            <div style={{ display: "flex", alignItems: "center", gap: "12px", padding: "20px 24px", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
                                <div style={{ width: "36px", height: "36px", borderRadius: "10px", background: `${tool.accent}18`, color: tool.accent, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                                    {tool.icon}
                                </div>
                                <div style={{ flex: 1 }}>
                                    <h3 style={{ fontSize: "15px", fontWeight: 800, color: "#fff", margin: 0 }}>{tool.title}</h3>
                                    <p style={{ fontSize: "12px", color: "#6B7280", margin: "2px 0 0", lineHeight: 1.5 }}>{tool.description}</p>
                                </div>
                                <Link href={tool.href} style={{ fontSize: "11px", fontWeight: 700, color: tool.accent, background: `${tool.accent}12`, border: `1px solid ${tool.accent}30`, padding: "6px 14px", borderRadius: "7px", textDecoration: "none", whiteSpace: "nowrap" }}>
                                    Open →
                                </Link>
                            </div>
                            {/* Steps + Tips */}
                            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0", padding: "20px 24px" }}>
                                <div style={{ paddingRight: "20px", borderRight: "1px solid rgba(255,255,255,0.06)" }}>
                                    <p style={{ fontSize: "10px", fontWeight: 700, color: "#6B7280", textTransform: "uppercase", letterSpacing: "0.08em", margin: "0 0 10px" }}>How to use</p>
                                    <ol style={{ margin: 0, paddingLeft: "18px", display: "flex", flexDirection: "column", gap: "8px" }}>
                                        {tool.steps.map((s, i) => (
                                            <li key={i} style={{ fontSize: "12px", color: "#9CA3AF", lineHeight: 1.6 }}>{s}</li>
                                        ))}
                                    </ol>
                                </div>
                                <div style={{ paddingLeft: "20px" }}>
                                    <p style={{ fontSize: "10px", fontWeight: 700, color: "#6B7280", textTransform: "uppercase", letterSpacing: "0.08em", margin: "0 0 10px" }}>Pro Tips</p>
                                    <ul style={{ margin: 0, paddingLeft: "0", listStyle: "none", display: "flex", flexDirection: "column", gap: "8px" }}>
                                        {tool.tips.map((t, i) => (
                                            <li key={i} style={{ fontSize: "12px", color: "#9CA3AF", lineHeight: 1.6, display: "flex", alignItems: "flex-start", gap: "6px" }}>
                                                <span style={{ color: tool.accent, flexShrink: 0, marginTop: "1px" }}>›</span>
                                                {t}
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* ── FAQ ── */}
            {activeTab === "faq" && (
                <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                    {FAQS.map((faq, i) => {
                        const open = openFaq === i;
                        return (
                            <div key={i} style={{ ...card, overflow: "hidden", transition: "border-color 0.15s", borderColor: open ? "rgba(99,102,241,0.3)" : "rgba(255,255,255,0.08)" }}>
                                <button onClick={() => setOpenFaq(open ? null : i)}
                                    style={{ width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between", padding: "16px 20px", background: "none", border: "none", cursor: "pointer", gap: "12px" }}>
                                    <span style={{ fontSize: "14px", fontWeight: 600, color: open ? "#a5b4fc" : "#fff", textAlign: "left", lineHeight: 1.4 }}>{faq.q}</span>
                                    <svg width="16" height="16" fill="none" stroke={open ? "#6366f1" : "#4B5563"} strokeWidth="2.5" viewBox="0 0 24 24"
                                        style={{ flexShrink: 0, transform: open ? "rotate(180deg)" : "none", transition: "transform 0.2s" }}>
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
                                    </svg>
                                </button>
                                {open && (
                                    <div style={{ padding: "0 20px 18px", borderTop: "1px solid rgba(255,255,255,0.05)" }}>
                                        <p style={{ fontSize: "13px", color: "#9CA3AF", lineHeight: 1.7, margin: "14px 0 0" }}>{faq.a}</p>
                                    </div>
                                )}
                            </div>
                        );
                    })}

                    {/* Support footer */}
                    <div style={{ ...card, padding: "22px 24px", display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "14px", marginTop: "8px" }}>
                        <div>
                            <p style={{ fontSize: "14px", fontWeight: 700, color: "#fff", margin: "0 0 4px" }}>Still have questions?</p>
                            <p style={{ fontSize: "12px", color: "#6B7280", margin: 0 }}>Open a GitHub issue or explore the source code.</p>
                        </div>
                        <a href="https://github.com" target="_blank" rel="noopener noreferrer" style={{
                            display: "inline-flex", alignItems: "center", gap: "8px",
                            padding: "9px 20px", borderRadius: "9px", fontSize: "12px", fontWeight: 700,
                            background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)",
                            color: "#fff", textDecoration: "none", transition: "all 0.15s",
                        }}>
                            <svg width="15" height="15" fill="currentColor" viewBox="0 0 24 24">
                                <path d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" />
                            </svg>
                            View on GitHub
                        </a>
                    </div>
                </div>
            )}
        </div>
    );
}
