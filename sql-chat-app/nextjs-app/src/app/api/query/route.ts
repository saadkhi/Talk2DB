import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { generateSQL } from "@/lib/sqlModel";
import { callOpenRouter } from "@/lib/openrouter";
import { executeQuery } from "@/lib/dbConnection";
import { isSQLSafe, extractSQL } from "@/lib/sqlSafety";
import { getSchema } from "../schema/route";
import { formatDatabaseError } from "@/lib/errorFormatter";
import { rateLimit, getIdentifier, RATE_LIMITS } from "@/lib/rateLimit";

export async function POST(req: Request) {
    // Rate limiting
    const identifier = getIdentifier(req);
    const rateLimitResult = rateLimit(identifier, RATE_LIMITS.query.limit, RATE_LIMITS.query.windowMs);
    
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
            return NextResponse.json(
                { error: "No database connected. Please connect your database first." },
                { status: 400 }
            );
        }

        // Get schema for context to guide SQL model
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
                console.warn("Could not load schema context, generating SQL without it:", e);
            }
        }

        const systemPromptMessage = `You are a high-performance PostgreSQL query compiler. Given a user request and database schema context, translate the request into a single syntactically correct PostgreSQL SELECT query.
Return ONLY raw SQL query text. Do NOT wrap it in markdown code blocks, do NOT write any comments, do NOT write explanations. Only pure SELECT SQL.`;

        const userMessageContent = schemaContext
            ? `Database Schema:\n${schemaContext}\n\nUser Request: ${prompt}\n\nGenerate SQL SELECT query.`
            : `User Request: ${prompt}\n\nGenerate SQL SELECT query.`;

        // Try fine-tuned model first, fallback to OpenRouter
        let rawSQL = "";
        try {
            rawSQL = await generateSQL(userMessageContent);
        } catch (gradioError) {
            if (process.env.NODE_ENV !== 'production') {
                console.warn("Gradio fine-tuned SQL model failed, falling back to OpenRouter:", gradioError);
            }
            rawSQL = await callOpenRouter(systemPromptMessage, userMessageContent);
        }

        const sql = extractSQL(rawSQL);

        if (!isSQLSafe(sql)) {
            return NextResponse.json({ error: "Generated query contains unsafe operations." }, { status: 400 });
        }

        // Add LIMIT if not present to protect against heavy payloads
        const safeSql = /\bLIMIT\b/i.test(sql) ? sql : `${sql} LIMIT 500`;

        try {
            const { columns, rows } = await executeQuery(user.dbConnectionString, safeSql);
            return NextResponse.json({ sql: safeSql, columns, rows });
        } catch (dbError: any) {
            if (process.env.NODE_ENV !== 'production') {
                console.error("Query Studio connection or execution failed:", dbError);
            }
            const friendly = formatDatabaseError(dbError);
            return NextResponse.json(
                {
                    error: friendly.friendlyMessage,
                    suggestion: friendly.suggestion,
                    originalError: friendly.message,
                    sql: safeSql,
                },
                { status: 422 }
            );
        }
    } catch (error: any) {
        if (process.env.NODE_ENV !== 'production') {
            console.error("Query Studio compiler route error:", error);
        }
        return NextResponse.json({ error: error.message || "Failed to catalog query results" }, { status: 500 });
    }
}
