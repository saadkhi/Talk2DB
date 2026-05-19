import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { callOpenRouter } from "@/lib/openrouter";

export async function POST(req: Request) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { prompt, columns, sampleRows } = await req.json();
        if (!prompt || !columns || !sampleRows) {
            return NextResponse.json({ error: "Missing required compilation parameters" }, { status: 400 });
        }

        const narrativePrompt = `
    Report request: "${prompt}"
    Data columns: ${columns.join(", ")}
    Sample data (first 20 rows): ${JSON.stringify(sampleRows.slice(0, 20))}
    
    Return ONLY this JSON (no markdown, no quotes around the outer wrapper, no \`\`\`json block, just pure text):
    {
      "title": "Report Title",
      "summary": "2-3 sentence executive summary explaining what the dataset represents and what trends exist.",
      "insights": ["insight 1", "insight 2", "insight 3", "insight 4"],
      "recommendations": ["recommendation 1", "recommendation 2", "recommendation 3"]
    }`;

        let narrative = {
            title: prompt,
            summary: "Report generated successfully. Dataset details and analytics compiled in tables.",
            insights: ["Data retrieved successfully.", "Review the table and chart for insights."],
            recommendations: ["Explore the data further with more specific queries."],
        };

        try {
            const raw = await callOpenRouter(
                "You are a senior data analyst and product consultant. Return ONLY a single valid JSON block containing title, summary, insights, and recommendations keys.",
                narrativePrompt
            );

            const cleanJson = raw.replace(/```json|```/gi, "").trim();
            narrative = JSON.parse(cleanJson);
        } catch (e: any) {
            console.warn("Fell back to standard narrative template due to LLM error:", e);
        }

        return NextResponse.json(narrative);
    } catch (error: any) {
        console.error("Report Narrative compilation API error:", error);
        return NextResponse.json({ error: error.message || "Failed compiled report content" }, { status: 500 });
    }
}
