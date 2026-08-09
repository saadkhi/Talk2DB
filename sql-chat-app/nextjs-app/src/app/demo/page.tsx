"use client";
/**
 * /demo  — No-login interactive demo
 *
 * Shows all major Talk2DB tools running against the hardcoded e-commerce
 * demo dataset (customers · products · orders · employees).
 * Zero auth required. Calls /api/guest/* which has no session check.
 */
import React, { useState } from "react";
import Link from "next/link";

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────
type Row = Record<string, any>;

// ─────────────────────────────────────────────────────────────────────────────
// Hardcoded demo dataset  (mirrors demoData.ts so page works without any API)
// ─────────────────────────────────────────────────────────────────────────────
const DEMO: Record<string, { columns: string[]; rows: Row[] }> = {
    customers: {
        columns: ["id","name","email","country","created_at","is_premium"],
        rows: [
            {id:1,  name:"Alice Martin",    email:"alice@example.com",  country:"USA",     created_at:"2024-01-05", is_premium:true},
            {id:2,  name:"Bob Chen",        email:"bob@example.com",    country:"Canada",  created_at:"2024-01-18", is_premium:false},
            {id:3,  name:"Clara Diaz",      email:"clara@example.com",  country:"Mexico",  created_at:"2024-02-03", is_premium:true},
            {id:4,  name:"David Kim",       email:"david@example.com",  country:"Korea",   created_at:"2024-02-14", is_premium:false},
            {id:5,  name:"Eva Rossi",       email:"eva@example.com",    country:"Italy",   created_at:"2024-03-01", is_premium:true},
            {id:6,  name:"Frank Müller",    email:"frank@example.com",  country:"Germany", created_at:"2024-03-20", is_premium:false},
            {id:7,  name:"Grace Li",        email:"grace@example.com",  country:"China",   created_at:"2024-04-07", is_premium:true},
            {id:8,  name:"Hiro Tanaka",     email:"hiro@example.com",   country:"Japan",   created_at:"2024-04-22", is_premium:false},
            {id:9,  name:"Isla Brown",      email:"isla@example.com",   country:"UK",      created_at:"2024-05-10", is_premium:true},
            {id:10, name:"James Osei",      email:"james@example.com",  country:"Ghana",   created_at:"2024-05-28", is_premium:false},
            {id:11, name:"Karen Patel",     email:"karen@example.com",  country:"India",   created_at:"2024-06-05", is_premium:true},
            {id:12, name:"Luis García",     email:"luis@example.com",   country:"Spain",   created_at:"2024-06-19", is_premium:false},
            {id:13, name:"Mia Johansson",   email:"mia@example.com",    country:"Sweden",  created_at:"2024-07-02", is_premium:true},
            {id:14, name:"Noah Williams",   email:"noah@example.com",   country:"USA",     created_at:"2024-07-15", is_premium:false},
            {id:15, name:"Olivia Tremblay", email:"olivia@example.com", country:"Canada",  created_at:"2024-08-01", is_premium:true},
        ],
    },
    products: {
        columns: ["id","name","category","price","stock"],
        rows: [
            {id:1,  name:"Wireless Headphones", category:"Electronics", price:89.99,  stock:142},
            {id:2,  name:"USB-C Hub",           category:"Electronics", price:34.50,  stock:310},
            {id:3,  name:"Mechanical Keyboard", category:"Electronics", price:124.00, stock:87},
            {id:4,  name:"Desk Lamp",           category:"Home Office", price:45.00,  stock:200},
            {id:5,  name:"Ergonomic Chair",     category:"Furniture",   price:349.99, stock:42},
            {id:6,  name:"Standing Desk",       category:"Furniture",   price:499.00, stock:28},
            {id:7,  name:"Notebook (A5)",       category:"Stationery",  price:7.99,   stock:500},
            {id:8,  name:"Premium Pen Set",     category:"Stationery",  price:19.50,  stock:280},
            {id:9,  name:"Webcam HD",           category:"Electronics", price:69.00,  stock:156},
            {id:10, name:"Monitor 27\"",        category:"Electronics", price:329.00, stock:63},
            {id:11, name:"Mouse Pad XL",        category:"Accessories", price:24.99,  stock:400},
            {id:12, name:"Cable Organizer",     category:"Accessories", price:12.50,  stock:600},
            {id:13, name:"Bookshelf",           category:"Furniture",   price:189.00, stock:55},
            {id:14, name:"Whiteboard",          category:"Home Office", price:75.00,  stock:110},
            {id:15, name:"Laptop Stand",        category:"Accessories", price:38.00,  stock:240},
        ],
    },
    employees: {
        columns: ["id","name","department","salary","hire_date"],
        rows: [
            {id:1,  name:"Sam Rivera",   department:"Engineering", salary:110000, hire_date:"2022-03-01"},
            {id:2,  name:"Lee Park",     department:"Engineering", salary:105000, hire_date:"2021-07-15"},
            {id:3,  name:"Maya Patel",   department:"Engineering", salary:98000,  hire_date:"2023-01-10"},
            {id:4,  name:"Alex Johnson", department:"Engineering", salary:92000,  hire_date:"2023-06-20"},
            {id:5,  name:"Jordan Smith", department:"Marketing",   salary:75000,  hire_date:"2022-09-05"},
            {id:6,  name:"Casey Brown",  department:"Marketing",   salary:70000,  hire_date:"2021-11-15"},
            {id:7,  name:"Morgan Davis", department:"HR",          salary:68000,  hire_date:"2022-02-28"},
            {id:8,  name:"Riley Wilson", department:"HR",          salary:63000,  hire_date:"2023-04-12"},
            {id:9,  name:"Taylor Moore", department:"Finance",     salary:88000,  hire_date:"2021-08-20"},
            {id:10, name:"Drew Garcia",  department:"Finance",     salary:82000,  hire_date:"2022-12-01"},
        ],
    },
    orders: {
        columns: ["id","customer_id","total","status","created_at"],
        rows: [
            {id:1,  customer_id:1,  total:249.99, status:"completed", created_at:"2024-01-15"},
            {id:2,  customer_id:3,  total:89.50,  status:"shipped",   created_at:"2024-01-22"},
            {id:3,  customer_id:5,  total:499.00, status:"completed", created_at:"2024-02-08"},
            {id:4,  customer_id:2,  total:34.50,  status:"pending",   created_at:"2024-02-14"},
            {id:5,  customer_id:7,  total:124.00, status:"completed", created_at:"2024-02-28"},
            {id:6,  customer_id:9,  total:45.00,  status:"shipped",   created_at:"2024-03-05"},
            {id:7,  customer_id:11, total:189.00, status:"cancelled", created_at:"2024-03-12"},
            {id:8,  customer_id:1,  total:349.99, status:"completed", created_at:"2024-03-20"},
            {id:9,  customer_id:4,  total:69.00,  status:"shipped",   created_at:"2024-04-02"},
            {id:10, customer_id:6,  total:38.00,  status:"completed", created_at:"2024-04-10"},
            {id:11, customer_id:8,  total:329.00, status:"completed", created_at:"2024-04-18"},
            {id:12, customer_id:13, total:24.99,  status:"pending",   created_at:"2024-04-25"},
            {id:13, customer_id:15, total:124.00, status:"completed", created_at:"2024-05-03"},
            {id:14, customer_id:2,  total:75.00,  status:"shipped",   created_at:"2024-05-11"},
            {id:15, customer_id:10, total:499.00, status:"completed", created_at:"2024-05-19"},
        ],
    },
};

// ─────────────────────────────────────────────────────────────────────────────
// Pre-built query presets
// ─────────────────────────────────────────────────────────────────────────────
const PRESETS = [
    {
        label: "All Customers",
        table: "customers",
        sql: "SELECT * FROM customers LIMIT 15",
        description: "Browse all 15 customers",
    },
    {
        label: "Revenue by Category",
        table: "products",
        sql: "SELECT category, COUNT(*) as products, ROUND(AVG(price),2) as avg_price, SUM(stock) as total_stock FROM products GROUP BY category ORDER BY avg_price DESC",
        description: "Products grouped by category with averages",
    },
    {
        label: "Salary by Department",
        table: "employees",
        sql: "SELECT department, COUNT(*) as headcount, MAX(salary) as max_salary, ROUND(AVG(salary),0) as avg_salary FROM employees GROUP BY department ORDER BY avg_salary DESC",
        description: "Team breakdown with compensation stats",
    },
    {
        label: "Recent Orders",
        table: "orders",
        sql: "SELECT id, customer_id, total, status, created_at FROM orders ORDER BY created_at DESC",
        description: "Latest orders sorted by date",
    },
    {
        label: "Premium Customers",
        table: "customers",
        sql: "SELECT name, email, country FROM customers WHERE is_premium = true ORDER BY name",
        description: "Filter by premium tier",
    },
    {
        label: "Low Stock Alert",
        table: "products",
        sql: "SELECT name, category, price, stock FROM products WHERE stock < 100 ORDER BY stock ASC",
        description: "Products running low on inventory",
    },
    {
        label: "Order Status Summary",
        table: "orders",
        sql: "SELECT status, COUNT(*) as count, ROUND(SUM(total),2) as total_revenue FROM orders GROUP BY status ORDER BY count DESC",
        description: "Orders grouped by fulfillment status",
    },
    {
        label: "High Earners",
        table: "employees",
        sql: "SELECT name, department, salary FROM employees WHERE salary > 90000 ORDER BY salary DESC",
        description: "Employees with salary above $90k",
    },
];

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────
function runLocalQuery(sql: string): { columns: string[]; rows: Row[]; error?: string } {
    try {
        const s = sql.trim().toLowerCase();

        // Determine which table to use
        let tableKey = "customers";
        for (const key of Object.keys(DEMO)) {
            if (s.includes(` ${key}`) || s.includes(`from ${key}`)) {
                tableKey = key; break;
            }
        }
        const source = DEMO[tableKey];

        let rows = [...source.rows];

        // WHERE filters (basic: = and true/false)
        const whereMatch = s.match(/where\s+(.+?)(?:group by|order by|limit|$)/);
        if (whereMatch) {
            const cond = whereMatch[1].trim();
            const eqMatch = cond.match(/(\w+)\s*=\s*['"]?(\w+)['"]?/);
            const gtMatch = cond.match(/(\w+)\s*>\s*(\d+)/);
            const ltMatch = cond.match(/(\w+)\s*<\s*(\d+)/);
            if (eqMatch) {
                const [, col, val] = eqMatch;
                rows = rows.filter(r => String(r[col]).toLowerCase() === val.toLowerCase() || String(r[col]) === val);
            } else if (gtMatch) {
                const [, col, val] = gtMatch;
                rows = rows.filter(r => Number(r[col]) > Number(val));
            } else if (ltMatch) {
                const [, col, val] = ltMatch;
                rows = rows.filter(r => Number(r[col]) < Number(val));
            }
        }

        // GROUP BY aggregation
        const groupMatch = s.match(/group\s+by\s+(\w+)/);
        if (groupMatch) {
            const groupCol = groupMatch[1];
            const groups = new Map<any, Row[]>();
            for (const row of rows) {
                const key = row[groupCol];
                if (!groups.has(key)) groups.set(key, []);
                groups.get(key)!.push(row);
            }

            rows = Array.from(groups.entries()).map(([gVal, gRows]) => {
                const out: Row = { [groupCol]: gVal };

                // Extract SELECT expressions
                const selectPart = sql.replace(/\n/g, " ").match(/select\s+(.+?)\s+from/i)?.[1] ?? "*";
                const exprs = selectPart.split(",").map(e => e.trim());

                for (const expr of exprs) {
                    const countMatch = expr.match(/count\(\s*\*?\s*\)(?:\s+as\s+(\w+))?/i);
                    const sumMatch   = expr.match(/sum\((\w+)\)(?:\s+as\s+(\w+))?/i);
                    const avgMatch   = expr.match(/(?:round\()?avg\((\w+)\)(?:,\s*\d+\))?\s*(?:as\s+(\w+))?/i);
                    const maxMatch   = expr.match(/max\((\w+)\)(?:\s+as\s+(\w+))?/i);
                    const minMatch   = expr.match(/min\((\w+)\)(?:\s+as\s+(\w+))?/i);

                    if (countMatch) out[countMatch[1] ?? "count"] = gRows.length;
                    else if (sumMatch) {
                        const col = sumMatch[1]; const alias = sumMatch[2] ?? `sum_${col}`;
                        out[alias] = gRows.reduce((a, r) => a + (Number(r[col]) || 0), 0);
                    } else if (avgMatch) {
                        const col = avgMatch[1]; const alias = avgMatch[2] ?? `avg_${col}`;
                        const avg = gRows.reduce((a, r) => a + (Number(r[col]) || 0), 0) / gRows.length;
                        out[alias] = Math.round(avg);
                    } else if (maxMatch) {
                        const col = maxMatch[1]; const alias = maxMatch[2] ?? `max_${col}`;
                        out[alias] = Math.max(...gRows.map(r => Number(r[col])));
                    } else if (minMatch) {
                        const col = minMatch[1]; const alias = minMatch[2] ?? `min_${col}`;
                        out[alias] = Math.min(...gRows.map(r => Number(r[col])));
                    }
                }
                return out;
            });
        }

        // ORDER BY
        const orderMatch = s.match(/order\s+by\s+(\w+)(?:\s+(asc|desc))?/);
        if (orderMatch) {
            const col = orderMatch[1]; const dir = orderMatch[2] === "desc" ? -1 : 1;
            rows.sort((a, b) => {
                const av = a[col]; const bv = b[col];
                if (av === undefined || bv === undefined) return 0;
                if (typeof av === "number" && typeof bv === "number") return (av - bv) * dir;
                return String(av).localeCompare(String(bv)) * dir;
            });
        }

        // LIMIT
        const limitMatch = s.match(/limit\s+(\d+)/);
        if (limitMatch) rows = rows.slice(0, parseInt(limitMatch[1]));

        // SELECT columns
        const selectPart = sql.replace(/\n/g," ").match(/SELECT\s+(.+?)\s+FROM/i)?.[1];
        let columns = source.columns;

        if (selectPart && selectPart.trim() !== "*") {
            // For grouped results, derive columns from result keys
            if (groupMatch) {
                columns = rows.length > 0 ? Object.keys(rows[0]) : [];
            } else {
                const rawCols = selectPart.split(",").map(c => {
                    const alias = c.match(/(?:as\s+)?(\w+)\s*$/i)?.[1] ?? c.trim().split(/\s+/).pop() ?? c.trim();
                    return alias.replace(/["'`]/g, "");
                });
                columns = rawCols.filter(c => c.length > 0);
                // Filter rows to only selected columns
                rows = rows.map(r => {
                    const out: Row = {};
                    rawCols.forEach(col => { if (r[col] !== undefined) out[col] = r[col]; });
                    if (Object.keys(out).length === 0) return r;
                    return out;
                });
            }
        }

        if (rows.length > 0) columns = Object.keys(rows[0]);

        return { columns, rows };
    } catch (e: any) {
        return { columns: [], rows: [], error: e.message };
    }
}

// Simple bar chart using plain divs
function BarChart({ rows, labelCol, valueCol, color = "#6366f1" }: {
    rows: Row[]; labelCol: string; valueCol: string; color?: string;
}) {
    const max = Math.max(...rows.map(r => Number(r[valueCol]) || 0));
    if (max === 0) return null;
    return (
        <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
            {rows.slice(0, 8).map((row, i) => {
                const val = Number(row[valueCol]) || 0;
                const pct = Math.round((val / max) * 100);
                return (
                    <div key={i} style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                        <span style={{ fontSize: "11px", color: "#9CA3AF", width: "110px", flexShrink: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                            {String(row[labelCol])}
                        </span>
                        <div style={{ flex: 1, height: "22px", background: "rgba(255,255,255,0.04)", borderRadius: "4px", overflow: "hidden" }}>
                            <div style={{ height: "100%", width: `${pct}%`, background: color, borderRadius: "4px", transition: "width 0.5s ease", display: "flex", alignItems: "center", paddingLeft: "8px" }}>
                                <span style={{ fontSize: "10px", fontWeight: 700, color: "#fff", whiteSpace: "nowrap" }}>{val.toLocaleString()}</span>
                            </div>
                        </div>
                    </div>
                );
            })}
        </div>
    );
}

// ── DataTable component ───────────────────────────────────────────────────────
function DataTable({ columns, rows }: { columns: string[]; rows: Row[] }) {
    const visibleCols = columns.slice(0, 8);
    return (
        <div style={{ overflowX: "auto", borderRadius: "10px", border: "1px solid rgba(255,255,255,0.07)" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "12px" }}>
                <thead>
                    <tr style={{ background: "rgba(255,255,255,0.04)" }}>
                        {visibleCols.map(c => (
                            <th key={c} style={{ padding: "9px 14px", textAlign: "left", color: "#818cf8", fontWeight: 700, fontSize: "10px", textTransform: "uppercase", letterSpacing: "0.07em", whiteSpace: "nowrap" }}>{c}</th>
                        ))}
                    </tr>
                </thead>
                <tbody>
                    {rows.map((row, i) => (
                        <tr key={i} style={{ borderTop: "1px solid rgba(255,255,255,0.05)" }}
                            onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = "rgba(255,255,255,0.025)"}
                            onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = "transparent"}>
                            {visibleCols.map(c => (
                                <td key={c} style={{ padding: "9px 14px", color: "#D1D5DB", maxWidth: "180px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                                    {row[c] === true ? <span style={{ color: "#34d399", fontWeight: 700 }}>✓ Yes</span>
                                        : row[c] === false ? <span style={{ color: "#6B7280" }}>No</span>
                                        : String(row[c] ?? "—")}
                                </td>
                            ))}
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
}

// ── Query Studio tab ──────────────────────────────────────────────────────────
function QueryTab() {
    const [sql, setSql] = useState(PRESETS[0].sql);
    const [result, setResult] = useState<{ columns: string[]; rows: Row[] } | null>(() => runLocalQuery(PRESETS[0].sql));
    const [error, setError] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);
    const [aiPrompt, setAiPrompt] = useState("");
    const [generating, setGenerating] = useState(false);
    const [activePreset, setActivePreset] = useState(0);

    const runQuery = (q: string) => {
        setLoading(true); setError(null);
        setTimeout(() => {
            const r = runLocalQuery(q);
            if (r.error) setError(r.error);
            else setResult(r);
            setLoading(false);
        }, 300);
    };

    const handlePreset = (i: number) => {
        setActivePreset(i);
        setSql(PRESETS[i].sql);
        runQuery(PRESETS[i].sql);
    };

    const generateSQL = async () => {
        if (!aiPrompt.trim()) return;
        setGenerating(true);
        try {
            const res = await fetch("/api/guest/query", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ sql: aiPrompt }),
            });
            const data = await res.json();
            if (data.error) {
                // Fall back to local query if API fails
                const r = runLocalQuery(aiPrompt);
                if (!r.error) { setResult(r); setSql(aiPrompt); }
                else setError("Try one of the preset queries above, or type SQL directly.");
            } else {
                setResult(data);
            }
        } catch {
            const r = runLocalQuery(aiPrompt);
            if (!r.error) { setResult(r); setSql(aiPrompt); }
        } finally { setGenerating(false); }
    };

    return (
        <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
            {/* AI prompt bar */}
            <div style={{ background: "#0d0f1a", border: "1px solid rgba(99,102,241,0.25)", borderRadius: "14px", padding: "18px 20px" }}>
                <p style={{ fontSize: "11px", fontWeight: 700, color: "#6B7280", textTransform: "uppercase", letterSpacing: "0.08em", margin: "0 0 10px" }}>Ask in plain English or write SQL directly</p>
                <div style={{ display: "flex", gap: "8px" }}>
                    <input value={aiPrompt} onChange={e => setAiPrompt(e.target.value)}
                        placeholder="e.g. Show top 5 products by price  OR  SELECT * FROM customers..."
                        onKeyDown={e => e.key === "Enter" && !generating && generateSQL()}
                        style={{ flex: 1, background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "9px", color: "#fff", padding: "10px 14px", fontSize: "13px", fontFamily: "inherit", outline: "none" }}
                        onFocus={e => (e.currentTarget.style.borderColor = "#6366f1")}
                        onBlur={e => (e.currentTarget.style.borderColor = "rgba(255,255,255,0.1)")} />
                    <button onClick={generateSQL} disabled={generating || !aiPrompt.trim()}
                        style={{ padding: "10px 20px", borderRadius: "9px", fontSize: "12px", fontWeight: 700, background: generating ? "rgba(99,102,241,0.4)" : "linear-gradient(135deg,#6366f1,#8b5cf6)", border: "none", color: "#fff", cursor: generating ? "not-allowed" : "pointer", whiteSpace: "nowrap", display: "flex", alignItems: "center", gap: "7px" }}>
                        {generating && <div style={{ width: "12px", height: "12px", border: "2px solid rgba(255,255,255,0.3)", borderTop: "2px solid #fff", borderRadius: "50%", animation: "spin 0.7s linear infinite" }} />}
                        {generating ? "Running…" : "▶ Run"}
                    </button>
                </div>
            </div>

            {/* Preset chips */}
            <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
                {PRESETS.map((p, i) => (
                    <button key={i} onClick={() => handlePreset(i)}
                        style={{ padding: "5px 14px", borderRadius: "20px", fontSize: "11px", fontWeight: 600, cursor: "pointer", border: "1px solid", borderColor: activePreset === i ? "rgba(99,102,241,0.5)" : "rgba(255,255,255,0.08)", background: activePreset === i ? "rgba(99,102,241,0.15)" : "rgba(255,255,255,0.03)", color: activePreset === i ? "#a5b4fc" : "#9CA3AF", transition: "all 0.15s" }}>
                        {p.label}
                    </button>
                ))}
            </div>

            {/* SQL editor */}
            <div style={{ background: "#0d0f1a", border: "1px solid rgba(255,255,255,0.07)", borderRadius: "12px", overflow: "hidden" }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 16px", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
                    <span style={{ fontSize: "10px", fontWeight: 700, color: "#6366f1", textTransform: "uppercase", letterSpacing: "0.08em" }}>SQL</span>
                    <button onClick={() => runQuery(sql)} style={{ padding: "4px 14px", borderRadius: "6px", fontSize: "11px", fontWeight: 700, background: "rgba(99,102,241,0.15)", border: "1px solid rgba(99,102,241,0.3)", color: "#818cf8", cursor: "pointer" }}>
                        Run Query ▶
                    </button>
                </div>
                <textarea value={sql} onChange={e => setSql(e.target.value)}
                    style={{ width: "100%", minHeight: "100px", background: "transparent", border: "none", color: "#94a3b8", padding: "14px 16px", fontSize: "12px", fontFamily: "monospace", lineHeight: 1.7, outline: "none", resize: "vertical", boxSizing: "border-box" }} />
            </div>

            {/* Results */}
            {error && <div style={{ background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.2)", borderRadius: "10px", padding: "12px 16px", fontSize: "12px", color: "#f87171" }}>⚠ {error}</div>}
            {loading && <div style={{ display: "flex", gap: "10px", alignItems: "center", color: "#6B7280", fontSize: "13px", padding: "16px 0" }}><div style={{ width: "16px", height: "16px", border: "2px solid rgba(99,102,241,0.2)", borderTop: "2px solid #6366f1", borderRadius: "50%", animation: "spin 0.7s linear infinite" }} />Running query…</div>}
            {result && !loading && (
                <div style={{ background: "#0d0f1a", border: "1px solid rgba(255,255,255,0.07)", borderRadius: "12px", overflow: "hidden" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "8px", padding: "10px 16px", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
                        <div style={{ width: "7px", height: "7px", borderRadius: "50%", background: "#10b981" }} />
                        <span style={{ fontSize: "10px", fontWeight: 700, color: "#10b981", textTransform: "uppercase", letterSpacing: "0.08em" }}>Results — {result.rows.length} rows</span>
                    </div>
                    <div style={{ padding: "12px 16px" }}><DataTable columns={result.columns} rows={result.rows} /></div>
                </div>
            )}
        </div>
    );
}

// ── Schema Explorer tab ───────────────────────────────────────────────────────
function SchemaTab() {
    const [selected, setSelected] = useState("customers");
    const table = DEMO[selected];
    return (
        <div style={{ display: "flex", gap: "16px", flexWrap: "wrap" }}>
            {/* Table list */}
            <div style={{ minWidth: "160px", display: "flex", flexDirection: "column", gap: "4px" }}>
                <p style={{ fontSize: "10px", fontWeight: 700, color: "#6B7280", textTransform: "uppercase", letterSpacing: "0.08em", margin: "0 0 8px" }}>Tables</p>
                {Object.keys(DEMO).map(t => (
                    <button key={t} onClick={() => setSelected(t)} style={{ padding: "8px 14px", borderRadius: "8px", fontSize: "12px", fontWeight: 600, cursor: "pointer", textAlign: "left", border: "1px solid", borderColor: selected === t ? "rgba(99,102,241,0.4)" : "rgba(255,255,255,0.06)", background: selected === t ? "rgba(99,102,241,0.12)" : "rgba(255,255,255,0.02)", color: selected === t ? "#a5b4fc" : "#9CA3AF", transition: "all 0.15s", display: "flex", alignItems: "center", gap: "8px" }}>
                        <svg width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" style={{ opacity: 0.6 }}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M20.25 6.375c0 2.278-3.694 4.125-8.25 4.125S3.75 8.653 3.75 6.375m16.5 0c0-2.278-3.694-4.125-8.25-4.125S3.75 4.097 3.75 6.375m16.5 0v11.25c0 2.278-3.694 4.125-8.25 4.125s-8.25-1.847-8.25-4.125V6.375m16.5 2.625c0 2.278-3.694 4.125-8.25 4.125s-8.25-1.847-8.25-4.125" />
                        </svg>
                        {t}
                        <span style={{ marginLeft: "auto", fontSize: "10px", color: "#4B5563", background: "rgba(255,255,255,0.05)", borderRadius: "20px", padding: "1px 7px" }}>{DEMO[t].rows.length}</span>
                    </button>
                ))}
            </div>
            {/* Column details */}
            <div style={{ flex: 1, minWidth: "300px", background: "#0d0f1a", border: "1px solid rgba(255,255,255,0.07)", borderRadius: "12px", overflow: "hidden" }}>
                <div style={{ padding: "12px 16px", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
                    <span style={{ fontFamily: "monospace", fontSize: "14px", fontWeight: 700, color: "#a5b4fc" }}>{selected}</span>
                    <span style={{ fontSize: "11px", color: "#6B7280", marginLeft: "10px" }}>{table.rows.length} rows · {table.columns.length} columns</span>
                </div>
                <div style={{ padding: "12px 16px", display: "flex", flexDirection: "column", gap: "6px" }}>
                    {table.columns.map((col, i) => {
                        const sampleRow = table.rows[0];
                        const val = sampleRow?.[col];
                        const type = typeof val === "number" ? "integer/numeric" : typeof val === "boolean" ? "boolean" : "varchar";
                        const isPK = col === "id";
                        return (
                            <div key={col} style={{ display: "flex", alignItems: "center", gap: "10px", padding: "8px 10px", borderRadius: "8px", background: i % 2 === 0 ? "rgba(255,255,255,0.02)" : "transparent" }}>
                                <span style={{ fontFamily: "monospace", fontSize: "12px", fontWeight: 700, color: isPK ? "#f59e0b" : "#D1D5DB", minWidth: "120px" }}>{col}{isPK ? " 🔑" : ""}</span>
                                <span style={{ fontSize: "10px", fontWeight: 600, color: "#22d3ee", background: "rgba(34,211,238,0.08)", border: "1px solid rgba(34,211,238,0.15)", borderRadius: "20px", padding: "1px 8px" }}>{type}</span>
                                <span style={{ fontSize: "11px", color: "#4B5563", marginLeft: "auto", fontFamily: "monospace" }}>{String(val ?? "null").slice(0, 20)}</span>
                            </div>
                        );
                    })}
                </div>
                {/* Sample preview */}
                <div style={{ padding: "0 16px 16px" }}>
                    <p style={{ fontSize: "10px", fontWeight: 700, color: "#6B7280", textTransform: "uppercase", letterSpacing: "0.08em", margin: "8px 0" }}>Sample Data (first 5 rows)</p>
                    <DataTable columns={table.columns} rows={table.rows.slice(0, 5)} />
                </div>
            </div>
        </div>
    );
}

// ── Data Profiler tab ─────────────────────────────────────────────────────────
function ProfilerTab() {
    const [selected, setSelected] = useState("products");
    const table = DEMO[selected];

    const stats = table.columns.map(col => {
        const vals = table.rows.map(r => r[col]);
        const nonNull = vals.filter(v => v !== null && v !== undefined && v !== "");
        const nullCount = vals.length - nonNull.length;
        const distinct = new Set(nonNull.map(String)).size;
        const nums = nonNull.map(Number).filter(n => !isNaN(n));
        const isNum = nums.length === nonNull.length && nonNull.length > 0;
        return {
            col, nullCount,
            nullPct: vals.length > 0 ? Math.round((nullCount / vals.length) * 100) : 0,
            distinct,
            type: isNum ? "number" : typeof vals[0] === "boolean" ? "boolean" : "text",
            min: isNum ? Math.min(...nums) : null,
            max: isNum ? Math.max(...nums) : null,
            avg: isNum ? Math.round(nums.reduce((a, b) => a + b, 0) / nums.length) : null,
            samples: Array.from(new Set(nonNull.map(String))).slice(0, 3),
        };
    });

    const TYPE_CLR: Record<string, string> = { number: "#34d399", boolean: "#f59e0b", text: "#a78bfa" };

    return (
        <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
            <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
                {Object.keys(DEMO).map(t => (
                    <button key={t} onClick={() => setSelected(t)} style={{ padding: "6px 16px", borderRadius: "20px", fontSize: "12px", fontWeight: 600, cursor: "pointer", border: "1px solid", borderColor: selected === t ? "rgba(99,102,241,0.5)" : "rgba(255,255,255,0.08)", background: selected === t ? "rgba(99,102,241,0.15)" : "rgba(255,255,255,0.03)", color: selected === t ? "#a5b4fc" : "#9CA3AF", transition: "all 0.15s" }}>
                        {t}
                    </button>
                ))}
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(130px,1fr))", gap: "10px" }}>
                {[
                    { label: "Rows",     val: table.rows.length,   color: "#6366f1" },
                    { label: "Columns",  val: table.columns.length, color: "#a78bfa" },
                    { label: "Nulls",    val: stats.filter(s => s.nullCount > 0).length, color: "#f87171" },
                    { label: "Num Cols", val: stats.filter(s => s.type === "number").length, color: "#34d399" },
                ].map(item => (
                    <div key={item.label} style={{ background: "#0d0f1a", border: "1px solid rgba(255,255,255,0.07)", borderRadius: "12px", padding: "14px 16px" }}>
                        <p style={{ fontSize: "10px", fontWeight: 700, color: "#6B7280", textTransform: "uppercase", letterSpacing: "0.08em", margin: "0 0 4px" }}>{item.label}</p>
                        <p style={{ fontSize: "22px", fontWeight: 800, color: item.color, margin: 0 }}>{item.val}</p>
                    </div>
                ))}
            </div>

            <div style={{ background: "#0d0f1a", border: "1px solid rgba(255,255,255,0.07)", borderRadius: "12px", overflow: "hidden" }}>
                <div style={{ padding: "12px 16px", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
                    <span style={{ fontSize: "10px", fontWeight: 700, color: "#6B7280", textTransform: "uppercase", letterSpacing: "0.08em" }}>Column Analysis — {selected}</span>
                </div>
                <div style={{ overflowX: "auto" }}>
                    <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "12px" }}>
                        <thead>
                            <tr style={{ background: "rgba(255,255,255,0.03)" }}>
                                {["Column","Type","Nulls %","Distinct","Range / Samples","Quality"].map(h => (
                                    <th key={h} style={{ padding: "9px 14px", textAlign: "left", fontSize: "10px", fontWeight: 700, color: "#6B7280", textTransform: "uppercase", letterSpacing: "0.06em", whiteSpace: "nowrap" }}>{h}</th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {stats.map(s => (
                                <tr key={s.col} style={{ borderTop: "1px solid rgba(255,255,255,0.05)" }}
                                    onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = "rgba(255,255,255,0.02)"}
                                    onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = "transparent"}>
                                    <td style={{ padding: "9px 14px", fontFamily: "monospace", fontWeight: 700, color: "#D1D5DB" }}>{s.col}</td>
                                    <td style={{ padding: "9px 14px" }}>
                                        <span style={{ fontSize: "10px", fontWeight: 700, padding: "2px 8px", borderRadius: "20px", background: `${TYPE_CLR[s.type] ?? "#6B7280"}18`, color: TYPE_CLR[s.type] ?? "#6B7280", border: `1px solid ${TYPE_CLR[s.type] ?? "#6B7280"}30` }}>{s.type}</span>
                                    </td>
                                    <td style={{ padding: "9px 14px" }}>
                                        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                                            <span style={{ fontWeight: 700, color: s.nullPct > 30 ? "#f87171" : "#D1D5DB" }}>{s.nullPct}%</span>
                                            <div style={{ width: "50px", height: "4px", background: "rgba(255,255,255,0.06)", borderRadius: "2px" }}>
                                                <div style={{ height: "100%", width: `${s.nullPct}%`, background: s.nullPct > 30 ? "#f87171" : "#10b981", borderRadius: "2px" }} />
                                            </div>
                                        </div>
                                    </td>
                                    <td style={{ padding: "9px 14px", color: "#9CA3AF", fontFamily: "monospace" }}>{s.distinct}</td>
                                    <td style={{ padding: "9px 14px", fontSize: "11px", color: "#6B7280" }}>
                                        {s.min !== null ? <span style={{ color: "#a78bfa", fontFamily: "monospace" }}>{s.min.toLocaleString()} – {s.max?.toLocaleString()} (avg {s.avg?.toLocaleString()})</span> : s.samples.join(", ")}
                                    </td>
                                    <td style={{ padding: "9px 14px" }}>
                                        {s.nullPct === 0
                                            ? <span style={{ fontSize: "10px", fontWeight: 700, padding: "2px 8px", borderRadius: "4px", background: "rgba(16,185,129,0.1)", border: "1px solid rgba(16,185,129,0.2)", color: "#34d399" }}>✓ Clean</span>
                                            : <span style={{ fontSize: "10px", fontWeight: 700, padding: "2px 8px", borderRadius: "4px", background: "rgba(245,158,11,0.1)", border: "1px solid rgba(245,158,11,0.2)", color: "#f59e0b" }}>Has Nulls</span>}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}

// ── Visualizer tab ────────────────────────────────────────────────────────────
function VisualizerTab() {
    const charts = [
        {
            title: "Revenue by Product Category",
            labelCol: "name", valueCol: "price", color: "#6366f1",
            data: [
                { name: "Electronics", price: 746 },
                { name: "Furniture",   price: 1038 },
                { name: "Home Office", price: 120 },
                { name: "Stationery",  price: 27 },
                { name: "Accessories", price: 75 },
            ],
        },
        {
            title: "Avg Salary by Department",
            labelCol: "name", valueCol: "price", color: "#06b6d4",
            data: [
                { name: "Engineering", price: 101250 },
                { name: "Finance",     price: 85000 },
                { name: "Marketing",   price: 72500 },
                { name: "HR",          price: 65500 },
            ],
        },
        {
            title: "Customer Count by Country (Top 5)",
            labelCol: "name", valueCol: "price", color: "#10b981",
            data: [
                { name: "USA",     price: 3 },
                { name: "Canada",  price: 2 },
                { name: "UK",      price: 2 },
                { name: "Germany", price: 2 },
                { name: "Japan",   price: 1 },
            ],
        },
        {
            title: "Order Status Distribution",
            labelCol: "name", valueCol: "price", color: "#f59e0b",
            data: [
                { name: "completed", price: 8 },
                { name: "shipped",   price: 4 },
                { name: "pending",   price: 2 },
                { name: "cancelled", price: 1 },
            ],
        },
    ];

    return (
        <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
            <p style={{ fontSize: "13px", color: "#9CA3AF", margin: 0 }}>
                Live bar charts generated from the demo e-commerce dataset. Connect your own database to visualize your actual data.
            </p>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(380px,1fr))", gap: "16px" }}>
                {charts.map(chart => (
                    <div key={chart.title} style={{ background: "#0d0f1a", border: "1px solid rgba(255,255,255,0.07)", borderRadius: "14px", padding: "18px 20px" }}>
                        <p style={{ fontSize: "13px", fontWeight: 700, color: "var(--text-primary, #fff)", margin: "0 0 16px" }}>{chart.title}</p>
                        <BarChart rows={chart.data} labelCol="name" valueCol="price" color={chart.color} />
                    </div>
                ))}
            </div>

            {/* Metrics row */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(160px,1fr))", gap: "12px" }}>
                {[
                    { label: "Total Customers",   val: "20",      color: "#6366f1" },
                    { label: "Total Products",    val: "15",      color: "#a78bfa" },
                    { label: "Total Orders",      val: "15",      color: "#10b981" },
                    { label: "Total Employees",   val: "10",      color: "#06b6d4" },
                    { label: "Avg Product Price", val: "$138.49", color: "#f59e0b" },
                    { label: "Premium Customers", val: "8 (53%)", color: "#34d399" },
                ].map(m => (
                    <div key={m.label} style={{ background: "#0d0f1a", border: "1px solid rgba(255,255,255,0.07)", borderRadius: "12px", padding: "14px 16px" }}>
                        <p style={{ fontSize: "10px", fontWeight: 700, color: "#6B7280", textTransform: "uppercase", letterSpacing: "0.08em", margin: "0 0 6px" }}>{m.label}</p>
                        <p style={{ fontSize: "20px", fontWeight: 800, color: m.color, margin: 0, letterSpacing: "-0.02em" }}>{m.val}</p>
                    </div>
                ))}
            </div>
        </div>
    );
}

// ── Main Demo Page ─────────────────────────────────────────────────────────────
type DemoTab = "query" | "schema" | "profiler" | "visualizer";

const DEMO_TABS: { id: DemoTab; label: string; icon: string; desc: string }[] = [
    { id: "query",      label: "Query Studio",    icon: "⌨️",  desc: "Write SQL or ask in plain English" },
    { id: "visualizer", label: "Data Visualizer", icon: "📊",  desc: "Charts & metrics from demo data"    },
    { id: "schema",     label: "Schema Explorer", icon: "🗂️",  desc: "Browse tables, columns & types"    },
    { id: "profiler",   label: "Data Profiler",   icon: "🔍",  desc: "Quality analysis & null rates"     },
];

export default function DemoPage() {
    const [activeTab, setActiveTab] = useState<DemoTab>("query");

    return (
        <div style={{ minHeight: "100vh", background: "#060812", color: "#fff", fontFamily: "system-ui, -apple-system, sans-serif" }}>
            <style>{`
                @keyframes spin { to { transform: rotate(360deg); } }
                * { box-sizing: border-box; }
                ::-webkit-scrollbar { width: 6px; height: 6px; }
                ::-webkit-scrollbar-track { background: transparent; }
                ::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.1); border-radius: 3px; }
            `}</style>

            {/* ── Top nav ── */}
            <nav style={{ position: "sticky", top: 0, zIndex: 50, display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 24px", height: "56px", background: "rgba(6,8,18,0.9)", borderBottom: "1px solid rgba(255,255,255,0.07)", backdropFilter: "blur(12px)" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                    <Link href="/" style={{ display: "flex", alignItems: "center", gap: "8px", textDecoration: "none" }}>
                        <div style={{ width: "28px", height: "28px", borderRadius: "8px", background: "linear-gradient(135deg,#6366f1,#8b5cf6)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                            <svg width="14" height="14" fill="none" stroke="white" strokeWidth="2" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M20.25 6.375c0 2.278-3.694 4.125-8.25 4.125S3.75 8.653 3.75 6.375m16.5 0c0-2.278-3.694-4.125-8.25-4.125S3.75 4.097 3.75 6.375m16.5 0v11.25c0 2.278-3.694 4.125-8.25 4.125s-8.25-1.847-8.25-4.125V6.375m16.5 2.625c0 2.278-3.694 4.125-8.25 4.125s-8.25-1.847-8.25-4.125" />
                            </svg>
                        </div>
                        <span style={{ fontSize: "15px", fontWeight: 700, color: "#fff" }}>Talk2DB</span>
                    </Link>
                    <span style={{ fontSize: "10px", fontWeight: 700, padding: "2px 10px", borderRadius: "20px", background: "rgba(6,182,212,0.12)", color: "#06b6d4", border: "1px solid rgba(6,182,212,0.25)", textTransform: "uppercase", letterSpacing: "0.08em" }}>
                        Live Demo
                    </span>
                </div>

                <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                    <span style={{ fontSize: "12px", color: "#6B7280" }}>Using sample e-commerce data · No login required</span>
                    <Link href="/auth/register" style={{ padding: "7px 16px", borderRadius: "8px", fontSize: "12px", fontWeight: 700, background: "linear-gradient(135deg,#6366f1,#8b5cf6)", color: "#fff", textDecoration: "none", boxShadow: "0 2px 10px rgba(99,102,241,0.35)" }}>
                        Get Started Free →
                    </Link>
                </div>
            </nav>

            {/* ── Hero banner ── */}
            <div style={{ background: "linear-gradient(180deg, rgba(99,102,241,0.08) 0%, transparent 100%)", borderBottom: "1px solid rgba(255,255,255,0.06)", padding: "32px 24px 0" }}>
                <div style={{ maxWidth: "1200px", margin: "0 auto" }}>
                    <div style={{ marginBottom: "24px" }}>
                        <h1 style={{ fontSize: "clamp(22px,3vw,32px)", fontWeight: 900, margin: "0 0 8px", letterSpacing: "-0.03em" }}>
                            Explore Talk2DB — No login needed
                        </h1>
                        <p style={{ fontSize: "14px", color: "#9CA3AF", margin: 0 }}>
                            All tools below are running against a live sample e-commerce database (customers · products · orders · employees).
                            Click any tab, run any query, explore freely.
                        </p>
                    </div>

                    {/* Dataset pill row */}
                    <div style={{ display: "flex", gap: "8px", flexWrap: "wrap", marginBottom: "0" }}>
                        {Object.entries(DEMO).map(([tbl, d]) => (
                            <div key={tbl} style={{ display: "flex", alignItems: "center", gap: "6px", padding: "5px 12px", borderRadius: "20px", background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", fontSize: "11px" }}>
                                <span style={{ width: "6px", height: "6px", borderRadius: "50%", background: "#06b6d4", flexShrink: 0 }} />
                                <span style={{ fontFamily: "monospace", color: "#06b6d4", fontWeight: 700 }}>{tbl}</span>
                                <span style={{ color: "#4B5563" }}>{d.rows.length} rows</span>
                            </div>
                        ))}
                        <div style={{ display: "flex", alignItems: "center", gap: "6px", padding: "5px 12px", borderRadius: "20px", background: "rgba(16,185,129,0.06)", border: "1px solid rgba(16,185,129,0.15)", fontSize: "11px", color: "#34d399", fontWeight: 600 }}>
                            🔒 Read-only · Data resets on refresh
                        </div>
                    </div>

                    {/* Tool tabs */}
                    <div style={{ display: "flex", gap: "2px", marginTop: "20px" }}>
                        {DEMO_TABS.map(t => (
                            <button key={t.id} onClick={() => setActiveTab(t.id)} style={{
                                padding: "12px 20px", border: "none", cursor: "pointer", transition: "all 0.15s", fontSize: "13px", fontWeight: 600,
                                background: activeTab === t.id ? "#0d0f1a" : "transparent",
                                color: activeTab === t.id ? "#fff" : "#6B7280",
                                borderRadius: "10px 10px 0 0",
                                borderTop: activeTab === t.id ? "2px solid #6366f1" : "2px solid transparent",
                                display: "flex", alignItems: "center", gap: "7px",
                            }}
                                onMouseEnter={e => { if (activeTab !== t.id) (e.currentTarget as HTMLElement).style.color = "#D1D5DB"; }}
                                onMouseLeave={e => { if (activeTab !== t.id) (e.currentTarget as HTMLElement).style.color = "#6B7280"; }}
                            >
                                <span>{t.icon}</span>
                                <span>{t.label}</span>
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            {/* ── Tool content ── */}
            <div style={{ maxWidth: "1200px", margin: "0 auto", padding: "28px 24px 60px" }}>
                {activeTab === "query"      && <QueryTab />}
                {activeTab === "visualizer" && <VisualizerTab />}
                {activeTab === "schema"     && <SchemaTab />}
                {activeTab === "profiler"   && <ProfilerTab />}
            </div>

            {/* ── CTA footer ── */}
            <div style={{ borderTop: "1px solid rgba(255,255,255,0.07)", background: "#0d0f1a", padding: "40px 24px", textAlign: "center" }}>
                <h2 style={{ fontSize: "clamp(20px,3vw,28px)", fontWeight: 900, margin: "0 0 10px", letterSpacing: "-0.03em" }}>
                    Ready to use it on <span style={{ background: "linear-gradient(135deg,#6366f1,#06b6d4)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>your own data?</span>
                </h2>
                <p style={{ fontSize: "14px", color: "#9CA3AF", margin: "0 0 24px" }}>
                    Connect your PostgreSQL database and get all tools with unlimited queries — free to start.
                </p>
                <div style={{ display: "flex", gap: "12px", justifyContent: "center", flexWrap: "wrap" }}>
                    <Link href="/auth/register" style={{ padding: "12px 28px", borderRadius: "10px", fontSize: "14px", fontWeight: 700, background: "linear-gradient(135deg,#6366f1,#8b5cf6)", color: "#fff", textDecoration: "none", boxShadow: "0 4px 18px rgba(99,102,241,0.35)" }}>
                        Create Free Account
                    </Link>
                    <Link href="/auth/login" style={{ padding: "12px 24px", borderRadius: "10px", fontSize: "14px", fontWeight: 600, background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.1)", color: "#D1D5DB", textDecoration: "none" }}>
                        Sign In
                    </Link>
                </div>
                <p style={{ fontSize: "11px", color: "#374151", margin: "16px 0 0" }}>No credit card · Takes 30 seconds</p>
            </div>
        </div>
    );
}
