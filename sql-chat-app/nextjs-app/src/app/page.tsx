"use client";
import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";

/* ── animated counter ───────────────────────────────────────── */
function Counter({ target, suffix = "" }: { target: number; suffix?: string }) {
    const [val, setVal] = useState(0);
    const ref = useRef<HTMLSpanElement>(null);
    useEffect(() => {
        const obs = new IntersectionObserver(([e]) => {
            if (!e.isIntersecting) return;
            obs.disconnect();
            let start = 0;
            const step = Math.ceil(target / 60);
            const t = setInterval(() => {
                start = Math.min(start + step, target);
                setVal(start);
                if (start >= target) clearInterval(t);
            }, 16);
        }, { threshold: 0.3 });
        if (ref.current) obs.observe(ref.current);
        return () => obs.disconnect();
    }, [target]);
    return <span ref={ref}>{val.toLocaleString()}{suffix}</span>;
}

/* ── demo SQL carousel ──────────────────────────────────────── */
const DEMO_QUERIES = [
    {
        prompt: "Show me total revenue by product category this quarter",
        sql: `SELECT category,
       SUM(o.total) AS revenue
FROM   orders o
JOIN   order_items oi ON oi.order_id = o.id
JOIN   products p     ON p.id = oi.product_id
WHERE  o.created_at >= DATE_TRUNC('quarter', NOW())
GROUP  BY category
ORDER  BY revenue DESC;`,
        result: [
            { category: "Electronics", revenue: "$42,810" },
            { category: "Furniture",   revenue: "$28,340" },
            { category: "Home Office", revenue: "$14,200" },
        ],
    },
    {
        prompt: "Which customers placed more than 3 orders last month?",
        sql: `SELECT c.name, COUNT(o.id) AS order_count,
       SUM(o.total) AS total_spent
FROM   customers c
JOIN   orders o ON o.customer_id = c.id
WHERE  o.created_at >= DATE_TRUNC('month', NOW() - INTERVAL '1 month')
GROUP  BY c.id, c.name
HAVING COUNT(o.id) > 3
ORDER  BY total_spent DESC;`,
        result: [
            { name: "Alice Martin",  order_count: 5, total_spent: "$1,249" },
            { name: "Grace Li",      order_count: 4, total_spent: "$998"   },
        ],
    },
    {
        prompt: "Average salary by department sorted highest first",
        sql: `SELECT department,
       ROUND(AVG(salary), 2) AS avg_salary,
       COUNT(*)              AS headcount
FROM   employees
GROUP  BY department
ORDER  BY avg_salary DESC;`,
        result: [
            { department: "Engineering", avg_salary: "$101,250", headcount: 4 },
            { department: "Marketing",   avg_salary: "$72,500",  headcount: 2 },
            { department: "HR",          avg_salary: "$65,500",  headcount: 2 },
        ],
    },
];

/* ── feature cards data ─────────────────────────────────────── */
const FEATURES = [
    {
        icon: (
            <svg width="22" height="22" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M20.25 6.375c0 2.278-3.694 4.125-8.25 4.125S3.75 8.653 3.75 6.375m16.5 0c0-2.278-3.694-4.125-8.25-4.125S3.75 4.097 3.75 6.375m16.5 0v11.25c0 2.278-3.694 4.125-8.25 4.125s-8.25-1.847-8.25-4.125V6.375m16.5 2.625c0 2.278-3.694 4.125-8.25 4.125s-8.25-1.847-8.25-4.125" />
            </svg>
        ),
        color: "#6366f1", bg: "rgba(99,102,241,0.12)",
        title: "Query Studio",
        desc: "Type in plain English. Get production-ready SQL instantly. Edit, run, and export — no DBA required.",
        tags: ["AI-powered", "Auto LIMIT", "Guardrails"],
    },
    {
        icon: (
            <svg width="22" height="22" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" />
            </svg>
        ),
        color: "#3b82f6", bg: "rgba(59,130,246,0.12)",
        title: "Data Visualizer",
        desc: "Describe a chart. Talk2DB writes the SQL and renders bar, line, pie, or area charts in seconds.",
        tags: ["4 chart types", "Recharts", "Export PNG"],
    },
    {
        icon: (
            <svg width="22" height="22" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
            </svg>
        ),
        color: "#10b981", bg: "rgba(16,185,129,0.12)",
        title: "Report Builder",
        desc: "One prompt generates a complete executive report — live dataset, chart, AI summary, and strategic insights.",
        tags: ["AI narrative", "Save & share", "PDF-ready"],
    },
    {
        icon: (
            <svg width="22" height="22" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 6.75V15m6-6v8.25m.503 3.498l4.875-2.437c.381-.19.622-.58.622-1.006V4.82c0-.836-.88-1.38-1.628-1.006l-3.869 1.934c-.317.159-.69.159-1.006 0L9.503 3.252a1.125 1.125 0 00-1.006 0L3.622 5.689C3.24 5.88 3 6.27 3 6.695V19.18c0 .836.88 1.38 1.628 1.006l3.869-1.934c.317-.159.69-.159 1.006 0l4.994 2.497c.317.158.69.158 1.006 0z" />
            </svg>
        ),
        color: "#f59e0b", bg: "rgba(245,158,11,0.12)",
        title: "Schema Explorer",
        desc: "Browse every table, column, type, and constraint in a clean interactive tree. Understand your schema at a glance.",
        tags: ["Live introspection", "Column types", "PK badges"],
    },
    {
        icon: (
            <svg width="22" height="22" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M7.5 14.25v2.25m3-4.5v4.5m3-6.75v6.75m3-9v9M6 20.25h12A2.25 2.25 0 0020.25 18V6A2.25 2.25 0 0018 3.75H6A2.25 2.25 0 003.75 6v12A2.25 2.25 0 006 20.25z" />
            </svg>
        ),
        color: "#8b5cf6", bg: "rgba(139,92,246,0.12)",
        title: "Data Profiler",
        desc: "Detect nulls, duplicates, anomalies, and cardinality. Know your data quality before it bites you.",
        tags: ["Null analysis", "Top values", "Anomaly flags"],
    },
    {
        icon: (
            <svg width="22" height="22" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
            </svg>
        ),
        color: "#06b6d4", bg: "rgba(6,182,212,0.12)",
        title: "Database Browser",
        desc: "Page through every table row-by-row with instant column sorting, structure view, and CSV/JSON export.",
        tags: ["Pagination", "Sort columns", "Export"],
    },
];

/* ── FAQ data ────────────────────────────────────────────────── */
const FAQ = [
    { q: "Do I need to know SQL?", a: "Not at all. Just describe what you want in plain English and Talk2DB writes the SQL for you. Advanced users can still edit the generated SQL directly." },
    { q: "Which databases are supported?", a: "PostgreSQL (including Neon and Supabase), MySQL, and SQLite. More dialects coming soon." },
    { q: "Is my data safe?", a: "Your database connection string is encrypted with AES-256 before storage and never logged. Talk2DB only runs SELECT queries — no writes, deletes, or drops." },
    { q: "Can I try without signing up?", a: "Yes. Every tool comes with 2 free guest tries on a demo dataset. No credit card, no email required." },
    { q: "What AI model is used?", a: "Talk2DB uses a combination of fine-tuned SQL models and OpenRouter-hosted LLMs (GPT, Claude, Gemini). The best available model is selected automatically." },
    { q: "Are there usage limits?", a: "Free accounts have generous rate limits. Registered users get significantly higher limits than guest users." },
];

/* ── Main component ─────────────────────────────────────────── */
export default function LandingPage() {
    const { status } = useSession();
    const router = useRouter();
    const [activeDemo, setActiveDemo] = useState(0);
    const [openFaq, setOpenFaq] = useState<number | null>(null);
    const [demoTyped, setDemoTyped] = useState("");

    // Redirect logged-in users straight to the dashboard
    useEffect(() => {
        if (status === "authenticated") router.replace("/dashboard");
    }, [status, router]);

    // Auto-rotate carousel every 4s
    useEffect(() => {
        const t = setInterval(() => setActiveDemo(p => (p + 1) % DEMO_QUERIES.length), 4000);
        return () => clearInterval(t);
    }, []);

    // Typewriter effect for the active demo prompt
    useEffect(() => {
        setDemoTyped("");
        const text = DEMO_QUERIES[activeDemo].prompt;
        let i = 0;
        const t = setInterval(() => {
            i++;
            setDemoTyped(text.slice(0, i));
            if (i >= text.length) clearInterval(t);
        }, 22);
        return () => clearInterval(t);
    }, [activeDemo]);

    if (status === "loading" || status === "authenticated") {
        return (
            <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "#080a12" }}>
                <div style={{ width: "20px", height: "20px", border: "2px solid rgba(99,102,241,0.2)", borderTop: "2px solid #6366f1", borderRadius: "50%", animation: "spin 0.8s linear infinite" }} />
                <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
            </div>
        );
    }

    const demo = DEMO_QUERIES[activeDemo];

    return (
        <div style={{ minHeight: "100vh", background: "#080a12", color: "#fff", fontFamily: "'Satoshi', system-ui, sans-serif", overflowX: "hidden" }}>

            {/* ── NAVBAR ── */}
            <nav style={{ position: "fixed", top: 0, left: 0, right: 0, zIndex: 50, display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 32px", height: "60px", background: "rgba(8,10,18,0.85)", backdropFilter: "blur(12px)", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
                <div style={{ fontSize: "20px", fontWeight: 900, letterSpacing: "-0.04em" }}>
                    Talk<span style={{ color: "#6366f1" }}>2</span>DB
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                    <Link href="/demo" style={{ fontSize: "13px", fontWeight: 600, color: "#9CA3AF", padding: "6px 16px", borderRadius: "8px", textDecoration: "none", transition: "color 0.15s" }}
                        onMouseEnter={e => (e.currentTarget as HTMLElement).style.color = "#fff"}
                        onMouseLeave={e => (e.currentTarget as HTMLElement).style.color = "#9CA3AF"}>
                        Try Demo
                    </Link>
                    <Link href="/auth/login" style={{ fontSize: "13px", fontWeight: 600, color: "#9CA3AF", padding: "6px 16px", borderRadius: "8px", border: "1px solid rgba(255,255,255,0.1)", textDecoration: "none", transition: "all 0.15s" }}
                        onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = "#fff"; (e.currentTarget as HTMLElement).style.borderColor = "rgba(255,255,255,0.2)"; }}
                        onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = "#9CA3AF"; (e.currentTarget as HTMLElement).style.borderColor = "rgba(255,255,255,0.1)"; }}>
                        Sign In
                    </Link>
                    <Link href="/auth/register" style={{ fontSize: "13px", fontWeight: 700, color: "#fff", padding: "7px 18px", borderRadius: "8px", background: "linear-gradient(135deg,#6366f1,#8b5cf6)", textDecoration: "none", boxShadow: "0 2px 10px rgba(99,102,241,0.35)", transition: "filter 0.15s" }}
                        onMouseEnter={e => (e.currentTarget as HTMLElement).style.filter = "brightness(1.12)"}
                        onMouseLeave={e => (e.currentTarget as HTMLElement).style.filter = "none"}>
                        Get Started Free
                    </Link>
                </div>
            </nav>

            {/* ── HERO ── */}
            <section style={{ paddingTop: "140px", paddingBottom: "80px", textAlign: "center", padding: "140px 24px 80px", position: "relative" }}>
                {/* Ambient glows */}
                <div style={{ position: "absolute", top: "10%", left: "20%", width: "400px", height: "400px", background: "radial-gradient(circle, rgba(99,102,241,0.12) 0%, transparent 70%)", pointerEvents: "none" }} />
                <div style={{ position: "absolute", top: "15%", right: "15%", width: "300px", height: "300px", background: "radial-gradient(circle, rgba(6,182,212,0.08) 0%, transparent 70%)", pointerEvents: "none" }} />

                {/* Badge */}
                <div style={{ display: "inline-flex", alignItems: "center", gap: "7px", padding: "5px 14px", borderRadius: "20px", background: "rgba(99,102,241,0.1)", border: "1px solid rgba(99,102,241,0.25)", marginBottom: "28px" }}>
                    <span style={{ width: "6px", height: "6px", borderRadius: "50%", background: "#6366f1", boxShadow: "0 0 8px #6366f1", display: "inline-block" }} />
                    <span style={{ fontSize: "12px", fontWeight: 700, color: "#a5b4fc", letterSpacing: "0.06em" }}>AI-POWERED SQL ASSISTANT</span>
                </div>

                <h1 style={{ fontSize: "clamp(36px, 6vw, 72px)", fontWeight: 900, lineHeight: 1.1, letterSpacing: "-0.04em", margin: "0 0 24px", maxWidth: "820px", marginLeft: "auto", marginRight: "auto" }}>
                    Chat with your<br />
                    Database.{" "}
                    <span style={{ background: "linear-gradient(135deg,#6366f1,#06b6d4)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
                        Naturally.
                    </span>
                </h1>

                <p style={{ fontSize: "clamp(15px,2vw,19px)", color: "#9CA3AF", lineHeight: 1.7, maxWidth: "580px", margin: "0 auto 40px" }}>
                    Ask questions in plain English, generate SQL, visualize results, and build executive reports — all in one workspace. No SQL knowledge needed.
                </p>

                <div style={{ display: "flex", gap: "14px", justifyContent: "center", flexWrap: "wrap", marginBottom: "16px" }}>
                    <Link href="/auth/register" style={{ display: "inline-flex", alignItems: "center", gap: "8px", padding: "14px 32px", borderRadius: "12px", background: "linear-gradient(135deg,#6366f1,#8b5cf6)", color: "#fff", fontSize: "15px", fontWeight: 800, textDecoration: "none", boxShadow: "0 6px 24px rgba(99,102,241,0.4)", transition: "filter 0.15s, transform 0.15s" }}
                        onMouseEnter={e => { (e.currentTarget as HTMLElement).style.filter = "brightness(1.1)"; (e.currentTarget as HTMLElement).style.transform = "translateY(-2px)"; }}
                        onMouseLeave={e => { (e.currentTarget as HTMLElement).style.filter = "none"; (e.currentTarget as HTMLElement).style.transform = "none"; }}>
                        Start for Free
                        <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" /></svg>
                    </Link>
                    <Link href="/demo" style={{ display: "inline-flex", alignItems: "center", gap: "8px", padding: "14px 28px", borderRadius: "12px", background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.12)", color: "#D1D5DB", fontSize: "15px", fontWeight: 700, textDecoration: "none", transition: "all 0.15s" }}
                        onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = "rgba(255,255,255,0.08)"; (e.currentTarget as HTMLElement).style.color = "#fff"; }}
                        onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = "rgba(255,255,255,0.04)"; (e.currentTarget as HTMLElement).style.color = "#D1D5DB"; }}>
                        <svg width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><polygon points="5 3 19 12 5 21 5 3" /></svg>
                        Live Demo
                    </Link>
                </div>
                <p style={{ fontSize: "12px", color: "#374151", margin: 0 }}>No credit card · 2 free tries on every tool · No setup</p>
            </section>

            {/* ── DEMO CAROUSEL ── */}
            <section style={{ padding: "0 24px 80px", maxWidth: "1100px", margin: "0 auto" }}>
                {/* Tab buttons */}
                <div style={{ display: "flex", gap: "8px", marginBottom: "20px", justifyContent: "center", flexWrap: "wrap" }}>
                    {DEMO_QUERIES.map((d, i) => (
                        <button key={i} onClick={() => setActiveDemo(i)} style={{
                            padding: "7px 18px", borderRadius: "20px", fontSize: "12px", fontWeight: 700, cursor: "pointer",
                            border: activeDemo === i ? "1px solid rgba(99,102,241,0.5)" : "1px solid rgba(255,255,255,0.08)",
                            background: activeDemo === i ? "rgba(99,102,241,0.15)" : "rgba(255,255,255,0.03)",
                            color: activeDemo === i ? "#a5b4fc" : "#6B7280",
                            transition: "all 0.15s",
                        }}>
                            Example {i + 1}
                        </button>
                    ))}
                </div>

                {/* Demo card */}
                <div style={{ background: "#0d0f1a", border: "1px solid rgba(255,255,255,0.08)", borderRadius: "20px", overflow: "hidden", boxShadow: "0 24px 60px rgba(0,0,0,0.5)" }}>
                    {/* Prompt row */}
                    <div style={{ padding: "20px 24px", borderBottom: "1px solid rgba(255,255,255,0.06)", display: "flex", alignItems: "center", gap: "12px" }}>
                        <div style={{ width: "32px", height: "32px", borderRadius: "50%", background: "linear-gradient(135deg,#6366f1,#8b5cf6)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                            <svg width="14" height="14" fill="white" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0" stroke="white" strokeWidth="1.5" fill="none" /></svg>
                        </div>
                        <p style={{ fontSize: "14px", color: "#D1D5DB", margin: 0, fontStyle: "italic" }}>
                            "{demoTyped}<span style={{ borderRight: "2px solid #6366f1", marginLeft: "1px", animation: "blink 1s step-end infinite" }} />"
                        </p>
                    </div>

                    {/* SQL row */}
                    <div style={{ padding: "20px 24px", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: "6px", marginBottom: "12px" }}>
                            <span style={{ width: "6px", height: "6px", borderRadius: "50%", background: "#6366f1", display: "inline-block" }} />
                            <span style={{ fontSize: "10px", fontWeight: 700, color: "#6366f1", textTransform: "uppercase", letterSpacing: "0.1em" }}>Generated SQL</span>
                        </div>
                        <pre style={{ margin: 0, padding: "14px 16px", background: "#040406", borderRadius: "10px", border: "1px solid rgba(255,255,255,0.06)", fontSize: "12px", fontFamily: "monospace", color: "#94a3b8", lineHeight: 1.75, overflowX: "auto", whiteSpace: "pre-wrap" }}>
                            {demo.sql.split("\n").map((line, li) => {
                                const kws = ["SELECT","FROM","WHERE","JOIN","GROUP BY","ORDER BY","HAVING","ROUND","COUNT","SUM","DATE_TRUNC","NOW","INTERVAL","ON","AND","LIMIT"];
                                let rendered = line;
                                // naive highlight
                                kws.forEach(kw => { rendered = rendered.replace(new RegExp(`\\b${kw}\\b`, "g"), `\x00${kw}\x01`); });
                                return (
                                    <span key={li}>
                                        {rendered.split(/\x00|\x01/).map((tok, ti) =>
                                            kws.some(k => k === tok)
                                                ? <span key={ti} style={{ color: "#818cf8", fontWeight: 700 }}>{tok}</span>
                                                : <span key={ti}>{tok}</span>
                                        )}
                                        {"\n"}
                                    </span>
                                );
                            })}
                        </pre>
                    </div>

                    {/* Results row */}
                    <div style={{ padding: "20px 24px" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: "6px", marginBottom: "12px" }}>
                            <span style={{ width: "6px", height: "6px", borderRadius: "50%", background: "#10b981", display: "inline-block" }} />
                            <span style={{ fontSize: "10px", fontWeight: 700, color: "#10b981", textTransform: "uppercase", letterSpacing: "0.1em" }}>Results · {demo.result.length} rows</span>
                        </div>
                        <div style={{ overflowX: "auto", borderRadius: "8px", border: "1px solid rgba(255,255,255,0.07)" }}>
                            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "12px" }}>
                                <thead>
                                    <tr style={{ background: "rgba(255,255,255,0.04)" }}>
                                        {Object.keys(demo.result[0]).map(k => (
                                            <th key={k} style={{ padding: "8px 14px", textAlign: "left", color: "#6366f1", fontWeight: 700, fontSize: "11px", textTransform: "uppercase", letterSpacing: "0.05em" }}>{k.replace(/_/g, " ")}</th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody>
                                    {demo.result.map((row, ri) => (
                                        <tr key={ri} style={{ borderTop: "1px solid rgba(255,255,255,0.04)" }}>
                                            {Object.values(row).map((v, vi) => (
                                                <td key={vi} style={{ padding: "8px 14px", color: "#D1D5DB", fontFamily: "monospace" }}>{String(v)}</td>
                                            ))}
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            </section>

            {/* ── STATS BAND ── */}
            <section style={{ padding: "48px 24px", background: "rgba(99,102,241,0.05)", borderTop: "1px solid rgba(99,102,241,0.1)", borderBottom: "1px solid rgba(99,102,241,0.1)" }}>
                <div style={{ maxWidth: "900px", margin: "0 auto", display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: "32px", textAlign: "center" }}>
                    {[
                        { value: 5,    suffix: "+",  label: "Analyst Tools"     },
                        { value: 3,    suffix: " DB", label: "Databases Supported" },
                        { value: 100,  suffix: "%",  label: "SELECT-only Safety" },
                        { value: 256,  suffix: "-bit",label: "AES Encryption"   },
                    ].map(s => (
                        <div key={s.label}>
                            <p style={{ fontSize: "clamp(28px,4vw,44px)", fontWeight: 900, color: "#a5b4fc", margin: "0 0 6px", letterSpacing: "-0.03em" }}>
                                <Counter target={s.value} suffix={s.suffix} />
                            </p>
                            <p style={{ fontSize: "13px", color: "#6B7280", margin: 0, fontWeight: 600 }}>{s.label}</p>
                        </div>
                    ))}
                </div>
            </section>

            {/* ── FEATURES GRID ── */}
            <section style={{ padding: "80px 24px", maxWidth: "1200px", margin: "0 auto" }}>
                <div style={{ textAlign: "center", marginBottom: "56px" }}>
                    <p style={{ fontSize: "11px", fontWeight: 700, color: "#6366f1", textTransform: "uppercase", letterSpacing: "0.12em", margin: "0 0 12px" }}>WHAT YOU GET</p>
                    <h2 style={{ fontSize: "clamp(26px,4vw,42px)", fontWeight: 900, letterSpacing: "-0.03em", margin: "0 0 14px" }}>Every tool an analyst needs</h2>
                    <p style={{ fontSize: "15px", color: "#9CA3AF", margin: 0, maxWidth: "500px", marginLeft: "auto", marginRight: "auto" }}>
                        From raw SQL to polished reports — Talk2DB covers the full analytical workflow in one platform.
                    </p>
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))", gap: "18px" }}>
                    {FEATURES.map(f => (
                        <div key={f.title} style={{
                            background: "#0d0f1a", border: "1px solid rgba(255,255,255,0.07)",
                            borderRadius: "16px", padding: "24px",
                            transition: "all 0.2s",
                        }}
                            onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = `${f.color}44`; (e.currentTarget as HTMLElement).style.transform = "translateY(-3px)"; (e.currentTarget as HTMLElement).style.boxShadow = `0 12px 30px ${f.color}18`; }}
                            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = "rgba(255,255,255,0.07)"; (e.currentTarget as HTMLElement).style.transform = "none"; (e.currentTarget as HTMLElement).style.boxShadow = "none"; }}
                        >
                            <div style={{ width: "44px", height: "44px", borderRadius: "12px", background: f.bg, color: f.color, display: "flex", alignItems: "center", justifyContent: "center", marginBottom: "16px" }}>
                                {f.icon}
                            </div>
                            <h3 style={{ fontSize: "16px", fontWeight: 800, color: "#fff", margin: "0 0 8px", letterSpacing: "-0.02em" }}>{f.title}</h3>
                            <p style={{ fontSize: "13px", color: "#9CA3AF", lineHeight: 1.65, margin: "0 0 14px" }}>{f.desc}</p>
                            <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
                                {f.tags.map(tag => (
                                    <span key={tag} style={{ fontSize: "10px", fontWeight: 700, color: f.color, background: f.bg, border: `1px solid ${f.color}33`, borderRadius: "20px", padding: "2px 9px" }}>{tag}</span>
                                ))}
                            </div>
                        </div>
                    ))}
                </div>
            </section>

            {/* ── HOW IT WORKS ── */}
            <section style={{ padding: "80px 24px", background: "rgba(255,255,255,0.015)", borderTop: "1px solid rgba(255,255,255,0.05)", borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
                <div style={{ maxWidth: "900px", margin: "0 auto" }}>
                    <div style={{ textAlign: "center", marginBottom: "52px" }}>
                        <p style={{ fontSize: "11px", fontWeight: 700, color: "#6366f1", textTransform: "uppercase", letterSpacing: "0.12em", margin: "0 0 12px" }}>HOW IT WORKS</p>
                        <h2 style={{ fontSize: "clamp(24px,3.5vw,38px)", fontWeight: 900, letterSpacing: "-0.03em", margin: 0 }}>Up and running in 3 steps</h2>
                    </div>
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: "32px" }}>
                        {[
                            { step: "01", color: "#6366f1", title: "Connect your database", body: "Paste your PostgreSQL, MySQL, or SQLite connection string. We verify and encrypt it with AES-256 — never stored in plain text." },
                            { step: "02", color: "#06b6d4", title: "Ask in plain English", body: "Type any data question: 'Show top customers by revenue', 'Chart sales by month', 'Profile the orders table'." },
                            { step: "03", color: "#10b981", title: "Get results instantly", body: "SQL is generated, executed, and the results are displayed as a table, chart, or report. Export to CSV, Excel, or JSON." },
                        ].map(s => (
                            <div key={s.step} style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
                                <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                                    <div style={{ width: "40px", height: "40px", borderRadius: "12px", background: `${s.color}18`, border: `1px solid ${s.color}33`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                                        <span style={{ fontSize: "12px", fontWeight: 900, color: s.color, fontFamily: "monospace" }}>{s.step}</span>
                                    </div>
                                    <h3 style={{ fontSize: "15px", fontWeight: 800, color: "#fff", margin: 0 }}>{s.title}</h3>
                                </div>
                                <p style={{ fontSize: "13px", color: "#9CA3AF", lineHeight: 1.7, margin: 0, paddingLeft: "52px" }}>{s.body}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* ── FAQ ── */}
            <section style={{ padding: "80px 24px", maxWidth: "760px", margin: "0 auto" }}>
                <div style={{ textAlign: "center", marginBottom: "48px" }}>
                    <p style={{ fontSize: "11px", fontWeight: 700, color: "#6366f1", textTransform: "uppercase", letterSpacing: "0.12em", margin: "0 0 12px" }}>FAQ</p>
                    <h2 style={{ fontSize: "clamp(24px,3.5vw,36px)", fontWeight: 900, letterSpacing: "-0.03em", margin: 0 }}>Common questions</h2>
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                    {FAQ.map((item, i) => (
                        <div key={i} style={{ background: "#0d0f1a", border: `1px solid ${openFaq === i ? "rgba(99,102,241,0.3)" : "rgba(255,255,255,0.07)"}`, borderRadius: "12px", overflow: "hidden", transition: "border-color 0.15s" }}>
                            <button
                                onClick={() => setOpenFaq(openFaq === i ? null : i)}
                                style={{ width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between", padding: "16px 20px", background: "none", border: "none", color: "#fff", fontSize: "14px", fontWeight: 700, cursor: "pointer", textAlign: "left", gap: "12px" }}
                            >
                                {item.q}
                                <svg width="16" height="16" fill="none" stroke={openFaq === i ? "#6366f1" : "#6B7280"} strokeWidth="2.5" viewBox="0 0 24 24" style={{ flexShrink: 0, transition: "transform 0.2s", transform: openFaq === i ? "rotate(180deg)" : "none" }}>
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
                                </svg>
                            </button>
                            {openFaq === i && (
                                <div style={{ padding: "0 20px 16px", fontSize: "13px", color: "#9CA3AF", lineHeight: 1.7 }}>
                                    {item.a}
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            </section>

            {/* ── FINAL CTA ── */}
            <section style={{ padding: "80px 24px", textAlign: "center", position: "relative", overflow: "hidden" }}>
                <div style={{ position: "absolute", inset: 0, background: "radial-gradient(ellipse at 50% 60%, rgba(99,102,241,0.12) 0%, transparent 65%)", pointerEvents: "none" }} />
                <div style={{ position: "relative" }}>
                    <h2 style={{ fontSize: "clamp(28px,4.5vw,52px)", fontWeight: 900, letterSpacing: "-0.04em", margin: "0 0 16px" }}>
                        Stop writing SQL.<br />
                        <span style={{ background: "linear-gradient(135deg,#6366f1,#06b6d4)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
                            Start asking questions.
                        </span>
                    </h2>
                    <p style={{ fontSize: "16px", color: "#9CA3AF", margin: "0 auto 40px", maxWidth: "460px", lineHeight: 1.65 }}>
                        Join analysts who spend less time on SQL and more time on insights. Free account, no credit card.
                    </p>
                    <div style={{ display: "flex", gap: "14px", justifyContent: "center", flexWrap: "wrap" }}>
                        <Link href="/auth/register" style={{ display: "inline-flex", alignItems: "center", gap: "8px", padding: "15px 36px", borderRadius: "12px", background: "linear-gradient(135deg,#6366f1,#8b5cf6)", color: "#fff", fontSize: "15px", fontWeight: 800, textDecoration: "none", boxShadow: "0 6px 28px rgba(99,102,241,0.45)", transition: "filter 0.15s, transform 0.15s" }}
                            onMouseEnter={e => { (e.currentTarget as HTMLElement).style.filter = "brightness(1.1)"; (e.currentTarget as HTMLElement).style.transform = "translateY(-2px)"; }}
                            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.filter = "none"; (e.currentTarget as HTMLElement).style.transform = "none"; }}>
                            Create Free Account
                            <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" /></svg>
                        </Link>
                        <Link href="/demo" style={{ display: "inline-flex", alignItems: "center", gap: "8px", padding: "15px 28px", borderRadius: "12px", background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.12)", color: "#D1D5DB", fontSize: "15px", fontWeight: 700, textDecoration: "none", transition: "all 0.15s" }}
                            onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = "rgba(255,255,255,0.08)"; (e.currentTarget as HTMLElement).style.color = "#fff"; }}
                            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = "rgba(255,255,255,0.04)"; (e.currentTarget as HTMLElement).style.color = "#D1D5DB"; }}>
                            Try Demo First
                        </Link>
                    </div>
                </div>
            </section>

            {/* ── FOOTER ── */}
            <footer style={{ padding: "28px 32px", borderTop: "1px solid rgba(255,255,255,0.06)", display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "12px" }}>
                <span style={{ fontSize: "14px", fontWeight: 900, letterSpacing: "-0.03em" }}>Talk<span style={{ color: "#6366f1" }}>2</span>DB</span>
                <div style={{ display: "flex", gap: "24px" }}>
                    {[["Sign In", "/auth/login"], ["Register", "/auth/register"], ["Dashboard", "/dashboard"]].map(([label, href]) => (
                        <Link key={label} href={href} style={{ fontSize: "12px", color: "#6B7280", textDecoration: "none", transition: "color 0.15s" }}
                            onMouseEnter={e => (e.currentTarget as HTMLElement).style.color = "#fff"}
                            onMouseLeave={e => (e.currentTarget as HTMLElement).style.color = "#6B7280"}>
                            {label}
                        </Link>
                    ))}
                </div>
                <p style={{ fontSize: "12px", color: "#374151", margin: 0 }}>© 2025 Talk2DB · Built for data teams</p>
            </footer>

            <style>{`
                @keyframes blink { 0%,100%{opacity:1} 50%{opacity:0} }
                @keyframes spin  { to{transform:rotate(360deg)} }
            `}</style>
        </div>
    );
}
