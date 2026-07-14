import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { generateSQL } from '../lib/sqlModel';
import { callOpenRouter } from '../lib/openrouter';
import { executeQuery, getUserDbPool } from '../lib/dbConnection';
import { isSQLSafe, extractSQL } from '../lib/sqlSafety';
import { formatDatabaseError } from '../lib/errorFormatter';
import { rateLimit, getIdentifier, RATE_LIMITS } from '../lib/rateLimit';

const prisma = new PrismaClient();

async function getSchema(dbUrl: string) {
    const pool = await getUserDbPool(dbUrl);
    const tablesResult = await pool.query(`SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' AND table_type = 'BASE TABLE' ORDER BY table_name`);
    const tables = await Promise.all(tablesResult.rows.map(async (row: any) => {
        const colResult = await pool.query(`SELECT column_name, data_type FROM information_schema.columns WHERE table_name = $1 AND table_schema = 'public' ORDER BY ordinal_position`, [row.table_name]);
        return { name: row.table_name, columns: colResult.rows.map((c: any) => ({ name: c.column_name, type: c.data_type })) };
    }));
    return { tables };
}

export async function queryHandler(req: Request, res: Response) {
    const identifier = getIdentifier(req as unknown as Request);
    const rateLimitResult = rateLimit(identifier, RATE_LIMITS.query.limit, RATE_LIMITS.query.windowMs);

    if (!rateLimitResult.success) {
        return res.status(429).json({ error: "Rate limit exceeded" });
    }

    try {
        const userId = (req as any).userId;
        if (!userId) return res.status(401).json({ error: "Unauthorized" });

        const { prompt } = req.body;
        if (!prompt) return res.status(400).json({ error: "Prompt required" });

        const user = await prisma.user.findUnique({ where: { id: userId } });
        if (!user?.dbConnectionString) return res.status(400).json({ error: "No database connected." });

        const dialect = user.dbDialect || "postgresql";

        let schemaContext = "";
        try {
            const schema = await getSchema(user.dbConnectionString);
            schemaContext = schema.tables.map((t: any) => `Table: ${t.name}\nColumns: ${t.columns.map((c: any) => `${c.name} (${c.type})`).join(", ")}`).join("\n\n");
        } catch (e) {
            console.warn("Could not load schema context");
        }

        // Build a dialect-aware system prompt so the LLM generates correct syntax
        const dialectInstructions: Record<string, string> = {
            postgresql: "Generate a syntactically correct PostgreSQL SELECT query. Use double-quoted identifiers for column/table names with spaces. Use $1, $2 for parameterised values if needed.",
            mysql:      "Generate a syntactically correct MySQL SELECT query. Use backtick-quoted identifiers. Use LIMIT instead of FETCH FIRST. Do NOT use PostgreSQL-specific functions.",
            sqlite:     "Generate a syntactically correct SQLite SELECT query. Use double-quoted identifiers. Avoid functions not supported by SQLite (e.g. no ARRAY_AGG, no DATE_TRUNC — use strftime instead).",
        };
        const dialectHint = dialectInstructions[dialect] || dialectInstructions.postgresql;

        const systemPromptMessage = `You are a high-performance ${dialect.toUpperCase()} query compiler. ${dialectHint}\nReturn ONLY raw SQL query text. Do NOT wrap it in markdown code blocks, do NOT write any comments, do NOT write explanations. Only pure SELECT SQL.`;
        const userMessageContent = schemaContext
            ? `Database Schema:\n${schemaContext}\n\nUser Request: ${prompt}\n\nGenerate SQL SELECT query.`
            : `User Request: ${prompt}\n\nGenerate SQL SELECT query.`;

        let rawSQL = "";
        try {
            rawSQL = await generateSQL(userMessageContent);
        } catch (error) {
            rawSQL = await callOpenRouter(systemPromptMessage, userMessageContent);
        }

        const sql = extractSQL(rawSQL);
        if (!isSQLSafe(sql)) return res.status(400).json({ error: "Generated query contains unsafe operations." });
        const safeSql = /\bLIMIT\b/i.test(sql) ? sql : `${sql} LIMIT 500`;

        try {
            const { columns, rows } = await executeQuery(user.dbConnectionString, safeSql);
            return res.json({ sql: safeSql, columns, rows });
        } catch (dbError: any) {
            return res.status(422).json({ error: dbError.message, sql: safeSql });
        }
    } catch (error: any) {
        return res.status(500).json({ error: error.message || "Failed to catalog query results" });
    }
}
