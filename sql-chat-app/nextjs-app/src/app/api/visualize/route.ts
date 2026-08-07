import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { callLLM } from "@/lib/llm";
import { executeQuery } from "@/lib/dbConnection";
import { extractSQL, isSQLSafe } from "@/lib/sqlSafety";
import { getSchema } from "../schema/route";
import { rateLimit, getIdentifier, RATE_LIMITS } from "@/lib/rateLimit";
import { resolveUserWithDb } from "@/lib/resolveUser";
import { checkPromptGuardrail } from "@/lib/promptGuardrail";

export async function POST(req: Request) {
    // Rate limiting
    const identifier = getIdentifier(req);
    const rateLimitResult = rateLimit(identifier, RATE_LIMITS.visualize.limit, RATE_LIMITS.visualize.windowMs);
    
    if (!rateLimitResult.success) {
        return NextResponse.json(
            { 
                error: "Rate limit exceeded", 
                limit: rateLimitResult.limit,
                resetTime: rateLimitResult.resetTime 
            },
            { 
                status: 429,
                headers: {
                    'X-RateLimit-Limit': rateLimitResult.limit.toString(),
                    'X-RateLimit-Remaining': rateLimitResult.remaining.toString(),
                    'X-RateLimit-Reset': rateLimitResult.resetTime.toString(),
                }
            }
        );
    }

    try {
        const session = await getServerSession(authOptions);
        if (!session?.user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { prompt } = await req.json();
        if (!prompt) {
            return NextResponse.json({ error: "Prompt required" }, { status: 400 });
        }

        // Guardrail — only allow data/DB-related visualisation requests
        const guard = checkPromptGuardrail(prompt);
        if (!guard.allowed) {
            return NextResponse.json({ error: guard.reason }, { status: 400 });
        }

        const user = await resolveUserWithDb(session);
        if (!user?.dbConnectionString) {
            return NextResponse.json({ error: "No database connected. Click 'Not Connected' to add your database." }, { status: 400 });
        }

        // Get database schema to help OpenRouter write appropriate SQL & pick chart columns
        let schemaContext = "";
        try {
            const schema = await getSchema(user.dbConnectionString);
            schemaContext = schema.tables
                .map(
                    (t: any) =>
                        `Table: ${t.name}\nColumns: ${t.columns
                            .map((c: any) => `${c.name} (${c.type})`)
                            .join(", ")}`
                )
                .join("\n\n");
        } catch (e) {
            if (process.env.NODE_ENV !== 'production') {
                console.warn("Schema context fetch failed for visualize config:", e);
            }
        }

        const VALID_CHART_TYPES = [
            "bar","bar-horizontal","bar-grouped","bar-grouped-horizontal",
            "bar-stacked","bar-stacked-horizontal","bar-negative","bar-waterfall","histogram","heatmap-bar",
            "line","line-multi","line-monotone","line-natural","line-basis","line-bump","line-step","line-step-after",
            "area","area-stacked","area-stream","area-normalized","area-step",
            "pie","donut","donut-thin","pie-multi","gauge",
            "scatter","bubble",
            "radar","radar-filled","radar-multi","radial-bar","radial-bar-stacked",
            "funnel","funnel-pyramid","treemap",
            "combo-bar-line","combo-bar-area","combo-area-line",
        ];

        const chartPrompt = `User request: "${prompt}"

Database Schema:
${schemaContext || "No schema context available."}

Valid chartType values (pick the BEST one for the request):
${VALID_CHART_TYPES.join(", ")}

Rules:
- Use "pie" or "donut" when comparing proportions of a whole (e.g. gender split, category share).
- Use "bar" or "bar-horizontal" for simple category comparisons.
- Use "bar-stacked" when the request mentions stacked or breakdown.
- Use "line" or "line-multi" for time-series or trends.
- Use "area-stacked" for cumulative trends.
- Use "scatter" or "bubble" when comparing two numeric columns.
- Use "radar" or "radar-filled" for multi-dimension comparisons.
- Use "radial-bar" for circular progress / ranking.
- Use "funnel" for pipeline / conversion data.
- Use "treemap" for hierarchical or proportional data with names.
- Use "combo-bar-line" when the user wants both a bar and line on the same chart.
- Use "histogram" or "heatmap-bar" for distributions.
- Use "gauge" for a single KPI value.

Return ONLY a JSON object (no markdown, no explanation, no \`\`\`json wrapper):
{
  "sql": "SELECT column1, column2 FROM table_name LIMIT 100",
  "chartType": "<one of the valid values above>",
  "xKey": "column_name_for_x_axis_or_category",
  "yKeys": ["column_name_for_values"],
  "title": "Descriptive Chart Title"
}`;

        let chartConfig: any;
        try {
            const raw = await callLLM(
                "You are a PostgreSQL and Recharts visualization expert. Return ONLY a single valid JSON block containing sql, chartType, xKey, yKeys and title keys.",
                chartPrompt
            );

            const cleanJSON = raw.replace(/```json|```/gi, "").trim();
            chartConfig = JSON.parse(cleanJSON);
        } catch (e: any) {
            if (process.env.NODE_ENV !== 'production') {
                console.error("OpenRouter chart config extraction failed:", e);
            }
            return NextResponse.json(
                { error: `Visualization config parsing failed: ${e.message || "Invalid AI output format"}` },
                { status: 500 }
            );
        }

        const sql = extractSQL(chartConfig.sql);
        if (!isSQLSafe(sql)) {
            return NextResponse.json({ error: "Generated visualization query contains unsafe operations." }, { status: 400 });
        }

        const safeSql = /\bLIMIT\b/i.test(sql) ? sql : `${sql} LIMIT 100`;

        try {
            const { columns, rows } = await executeQuery(user.dbConnectionString, safeSql);

            // Safety checks for keys matching real columns
            const validatedXKey = columns.includes(chartConfig.xKey)
                ? chartConfig.xKey
                : columns[0];
            const validatedYKeys = chartConfig.yKeys.filter((k: string) => columns.includes(k));
            const finalYKeys = validatedYKeys.length > 0 ? validatedYKeys : [columns[1] || columns[0]];

            return NextResponse.json({
                sql: safeSql,
                chartType: chartConfig.chartType || "bar",
                xKey: validatedXKey,
                yKeys: finalYKeys,
                title: chartConfig.title || prompt,
                columns,
                // Coerce numeric string columns to actual numbers so Recharts renders correctly.
                // PostgreSQL COUNT/SUM/AVG always come back as strings from the pg driver.
                data: rows.map((row: any) => {
                    const patched: any = { ...row };
                    for (const key of finalYKeys) {
                        const v = patched[key];
                        if (v !== null && v !== undefined && !isNaN(Number(v))) {
                            patched[key] = Number(v);
                        }
                    }
                    return patched;
                }),
            });
        } catch (dbError: any) {
            return NextResponse.json(
                {
                    error: `Visualization execution failed: ${dbError.message || "Failed running chart query"}`,
                    sql: safeSql,
                },
                { status: 422 }
            );
        }
    } catch (error: any) {
        if (process.env.NODE_ENV !== 'production') {
            console.error("Data Visualizer configuration helper error:", error);
        }
        return NextResponse.json({ error: error.message || "Critical error building visualization chart" }, { status: 500 });
    }
}
