/**
 * POST /api/autoflow/ai-insights
 *
 * Uses the configured LLM to generate natural-language insights from a
 * parsed dataset's column stats + sample rows.
 *
 * Body:
 * {
 *   fileName: string,
 *   columns: string[],
 *   stats: ColumnStat[],
 *   sampleRows: Record<string,any>[],  // up to 20 rows
 *   totalRows: number,
 *   format: "csv" | "excel" | "pdf",
 *   pdfText?: string,           // PDF raw text for context
 *   question?: string,          // optional user question; defaults to general analysis
 * }
 *
 * Returns: { insights: string }
 */

import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { callLLM } from "@/lib/llm";
import { resolveUserId } from "@/lib/resolveUser";
import { rateLimit, getIdentifier, RATE_LIMITS } from "@/lib/rateLimit";

export const maxDuration = 120;

export async function POST(req: Request) {
    // Rate-limit using the query limit bucket (same cost)
    const identifier = getIdentifier(req);
    const rl = rateLimit(identifier, RATE_LIMITS.query.limit, RATE_LIMITS.query.windowMs);
    if (!rl.success) {
        return NextResponse.json({ error: "Rate limit exceeded" }, { status: 429 });
    }

    const session = await getServerSession(authOptions);
    if (!session?.user) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = await resolveUserId(session);

    const body = await req.json();
    const { fileName, columns, stats, sampleRows, totalRows, format, pdfText, question } = body;

    if (!columns?.length && !pdfText) {
        return NextResponse.json({ error: "No data to analyze" }, { status: 400 });
    }

    // Build compact stat summary for the prompt
    const statSummary = (stats ?? [])
        .slice(0, 30) // cap at 30 columns in prompt
        .map((s: any) => {
            let line = `  - ${s.name} [${s.type}]: ${s.nullPct}% nulls, ${s.distinctCount} distinct`;
            if (s.min !== undefined) line += `, range ${s.min}–${s.max}, avg ${Number(s.avg).toFixed(2)}`;
            if (s.minDate) line += `, dates ${s.minDate} → ${s.maxDate}`;
            if (s.sampleValues?.length) line += `, e.g. ${s.sampleValues.slice(0, 3).join(", ")}`;
            return line;
        })
        .join("\n");

    // Build sample rows table (up to 10)
    const sampleStr = (sampleRows ?? []).slice(0, 10)
        .map((row: Record<string, any>, i: number) =>
            `Row ${i + 1}: ${Object.entries(row)
                .slice(0, 8)
                .map(([k, v]) => `${k}=${JSON.stringify(v)}`)
                .join(", ")}`
        )
        .join("\n");

    const systemPrompt = `You are a senior data analyst specializing in data quality, pattern recognition, and business insights.
Analyze the dataset described below and provide actionable, specific insights.

FORMAT YOUR RESPONSE as a structured report with these sections:
1. **Overview** — what the dataset is about, scale, and purpose
2. **Data Quality** — null rates, anomalies, type inconsistencies, issues to fix
3. **Key Patterns** — statistical observations, distributions, outliers
4. **Business Insights** — what the data tells us about the underlying process or domain
5. **Recommendations** — concrete next steps (data cleaning, enrichment, queries to run)

Be specific. Reference actual column names and values from the data. Keep the total response under 600 words.`;

    const userMessage = `FILE: ${fileName ?? "dataset"} (${format?.toUpperCase() ?? "CSV"})
TOTAL ROWS: ${totalRows ?? "unknown"}
COLUMNS (${columns?.length ?? 0}): ${columns?.slice(0, 20).join(", ")}

COLUMN STATISTICS:
${statSummary || "(no stats available)"}

SAMPLE DATA:
${sampleStr || "(no sample rows)"}
${pdfText ? `\nPDF CONTENT EXCERPT:\n${pdfText.slice(0, 2000)}` : ""}

${question ? `USER QUESTION: ${question}` : "Please provide a complete data analysis report based on the information above."}`;

    try {
        const insights = await callLLM(systemPrompt, userMessage, {
            userId: userId ?? undefined,
            source: "autoflow",
        });
        return NextResponse.json({ insights });
    } catch (err: any) {
        return NextResponse.json({ error: err.message || "AI analysis failed" }, { status: 503 });
    }
}
