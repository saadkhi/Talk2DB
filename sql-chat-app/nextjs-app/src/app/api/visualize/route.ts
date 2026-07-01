import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { callOpenRouter } from "@/lib/openrouter";
import { executeQuery } from "@/lib/dbConnection";
import { extractSQL, isSQLSafe } from "@/lib/sqlSafety";
import { getSchema } from "../schema/route";
import { rateLimit, getIdentifier, RATE_LIMITS } from "@/lib/rateLimit";

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

        const userId = (session.user as any).id;
        const user = await prisma.user.findUnique({ where: { id: userId } });
        if (!user?.dbConnectionString) {
            return NextResponse.json({ error: "No DB connected" }, { status: 400 });
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

        const chartPrompt = `User request: "${prompt}"
    
    Database Schema:
    ${schemaContext || "No schema context available."}
    
    Return ONLY a JSON object (no markdown, no explanation, no \`\`\`json wrapper, just pure text):
    {
      "sql": "SELECT column1, column2 FROM table_name LIMIT 100",
      "chartType": "bar|line|pie|area",
      "xKey": "column_name_for_x_axis",
      "yKeys": ["column_name_for_values"],
      "title": "Descriptive Chart Title"
    }`;

        let chartConfig: any;
        try {
            const raw = await callOpenRouter(
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
                data: rows,
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
