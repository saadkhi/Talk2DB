import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { generateSQL } from "@/lib/sqlModel";
import { callLLM } from "@/lib/llm";
import { executeQuery } from "@/lib/dbConnection";
import { extractSQL, isSQLSafe } from "@/lib/sqlSafety";
import { getSchema } from "../schema/route";
import { rateLimit, getIdentifier, RATE_LIMITS } from "@/lib/rateLimit";
import { resolveUserWithDb } from "@/lib/resolveUser";

export async function POST(req: Request) {
    // Rate limiting
    const identifier = getIdentifier(req);
    const rateLimitResult = rateLimit(identifier, RATE_LIMITS.report.limit, RATE_LIMITS.report.windowMs);
    
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

        const user = await resolveUserWithDb(session);
        if (!user?.dbConnectionString) {
            return NextResponse.json({ error: "No database connected. Click 'Not Connected' to add your database." }, { status: 400 });
        }

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
                console.warn("Report schema context helper failed:", e);
            }
        }

        // Step 1: Get SQL from fine-tuned model or OpenRouter fallback
        let rawSQL: string;
        const modelPrompt = schemaContext
            ? `Database Schema:\n${schemaContext}\n\nGenerate SQL for a reports dataset: ${prompt}`
            : `Generate SQL for a reports dataset: ${prompt}`;

        try {
            rawSQL = await generateSQL(modelPrompt);
        } catch {
            rawSQL = await callLLM(
                "You are an expert SQL compiler. Return ONLY a single raw SQL query, no comments, no markdown, no explanation.",
                modelPrompt
            );
        }

        const sql = extractSQL(rawSQL);
        if (!isSQLSafe(sql)) {
            return NextResponse.json({ error: "Generated report query is unsafe." }, { status: 400 });
        }

        const safeSql = /\bLIMIT\b/i.test(sql) ? sql : `${sql} LIMIT 500`;

        const { columns, rows } = await executeQuery(user.dbConnectionString, safeSql);

        // Step 2: Get chart config via LLM
        const chartRaw = await callLLM(
            "You are a Recharts configuration engine. Return ONLY a single JSON block (no markdown, no extra text).",
            `Given columns: [${columns.join(", ")}] and this report request: "${prompt}", return: {"chartType":"bar|line|pie|area","xKey":"axis_column","yKeys":["value_column"],"title":"Descriptive title"}`
        );

        let chartConfig = {
            chartType: "bar",
            xKey: columns[0],
            yKeys: [columns[1] || columns[0]],
            title: prompt,
        };

        try {
            const cleanJson = chartRaw.replace(/```json|```/gi, "").trim();
            const parsedConfig = JSON.parse(cleanJson);

            const validatedXKey = columns.includes(parsedConfig.xKey)
                ? parsedConfig.xKey
                : columns[0];
            const validatedYKeys = Array.isArray(parsedConfig.yKeys)
                ? parsedConfig.yKeys.filter((k: string) => columns.includes(k))
                : [];
            const finalYKeys = validatedYKeys.length > 0 ? validatedYKeys : [columns[1] || columns[0]];

            chartConfig = {
                chartType: parsedConfig.chartType || "bar",
                xKey: validatedXKey,
                yKeys: finalYKeys,
                title: parsedConfig.title || prompt,
            };
        } catch (e) {
            if (process.env.NODE_ENV !== 'production') {
                console.warn("Fallback to basic chart config due to parsing failure:", e);
            }
        }

        return NextResponse.json({
            sql: safeSql,
            columns,
            rows,
            chartConfig,
        });
    } catch (error: any) {
        if (process.env.NODE_ENV !== 'production') {
            console.error("Report data compiler API error:", error);
        }
        return NextResponse.json({ error: error.message || "Failed compiled report datasets" }, { status: 500 });
    }
}
