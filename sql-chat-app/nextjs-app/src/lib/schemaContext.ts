/**
 * schemaContext.ts — Rich schema introspection for LLM context
 *
 * Fetches tables, columns, primary keys, foreign keys, indexes,
 * and sample values so the LLM can generate accurate multi-table JOINs.
 *
 * Used by both /api/query and /api/chat routes.
 */

import { executeQuery } from "./dbConnection";

// ── Types ─────────────────────────────────────────────────────────────────────
export interface ColumnInfo {
    name: string;
    type: string;
    nullable: boolean;
    isPrimary: boolean;
    isForeignKey: boolean;
    references?: { table: string; column: string };
    sampleValues?: string[];
}

export interface TableInfo {
    name: string;
    rowCount: number;
    columns: ColumnInfo[];
}

export interface SchemaInfo {
    tables: TableInfo[];
    relationships: RelationshipInfo[];
}

export interface RelationshipInfo {
    fromTable: string;
    fromColumn: string;
    toTable: string;
    toColumn: string;
    constraintName: string;
}

// ── Main introspection function ───────────────────────────────────────────────
export async function getEnrichedSchema(encryptedUrl: string): Promise<SchemaInfo> {
    try {
        // 1. Get all public base tables
        const tablesResult = await executeQuery(
            encryptedUrl,
            `SELECT table_name
             FROM information_schema.tables
             WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
             ORDER BY table_name`
        );
        const tableNames: string[] = tablesResult.rows.map((r: any) => r.table_name);

        // 2. Get ALL foreign key relationships in one query
        const fkResult = await executeQuery(
            encryptedUrl,
            `SELECT
                tc.constraint_name,
                kcu.table_name        AS from_table,
                kcu.column_name       AS from_column,
                ccu.table_name        AS to_table,
                ccu.column_name       AS to_column
             FROM information_schema.table_constraints tc
             JOIN information_schema.key_column_usage kcu
                ON tc.constraint_name = kcu.constraint_name
                AND tc.table_schema = kcu.table_schema
             JOIN information_schema.constraint_column_usage ccu
                ON ccu.constraint_name = tc.constraint_name
                AND ccu.table_schema = tc.table_schema
             WHERE tc.constraint_type = 'FOREIGN KEY'
               AND tc.table_schema = 'public'
             ORDER BY from_table, from_column`
        );

        const relationships: RelationshipInfo[] = fkResult.rows.map((r: any) => ({
            constraintName: r.constraint_name,
            fromTable:   r.from_table,
            fromColumn:  r.from_column,
            toTable:     r.to_table,
            toColumn:    r.to_column,
        }));

        // Build a FK lookup map: "table.column" → { table, column }
        const fkMap = new Map<string, { table: string; column: string }>();
        for (const rel of relationships) {
            fkMap.set(`${rel.fromTable}.${rel.fromColumn}`, {
                table: rel.toTable,
                column: rel.toColumn,
            });
        }

        // 3. Get ALL columns across all tables in one query
        const safeNames = tableNames.map(n => `'${n.replace(/'/g, "''")}'`).join(",");
        const colsResult = tableNames.length > 0 ? await executeQuery(
            encryptedUrl,
            `SELECT
                c.table_name,
                c.column_name,
                c.data_type,
                c.is_nullable,
                c.character_maximum_length,
                CASE WHEN pk.column_name IS NOT NULL THEN true ELSE false END AS is_primary
             FROM information_schema.columns c
             LEFT JOIN (
                 SELECT kcu.table_name, kcu.column_name
                 FROM information_schema.key_column_usage kcu
                 JOIN information_schema.table_constraints tc
                     ON tc.constraint_name = kcu.constraint_name
                     AND tc.table_schema = kcu.table_schema
                 WHERE tc.constraint_type = 'PRIMARY KEY'
                   AND tc.table_schema = 'public'
             ) pk ON pk.table_name = c.table_name AND pk.column_name = c.column_name
             WHERE c.table_schema = 'public'
               AND c.table_name IN (${safeNames})
             ORDER BY c.table_name, c.ordinal_position`
        ) : { rows: [] };

        // Group columns by table
        const colsByTable = new Map<string, ColumnInfo[]>();
        for (const row of colsResult.rows) {
            const fkRef = fkMap.get(`${row.table_name}.${row.column_name}`);
            const col: ColumnInfo = {
                name: row.column_name,
                type: row.data_type,
                nullable: row.is_nullable === "YES",
                isPrimary: row.is_primary === true || row.is_primary === "true",
                isForeignKey: !!fkRef,
                references: fkRef,
            };
            if (!colsByTable.has(row.table_name)) colsByTable.set(row.table_name, []);
            colsByTable.get(row.table_name)!.push(col);
        }

        // 4. Get row counts + sample values for string/enum columns
        const tables: TableInfo[] = await Promise.all(
            tableNames.map(async (tableName) => {
                const safeName = tableName.replace(/"/g, '""');

                // Row count
                let rowCount = 0;
                try {
                    const cr = await executeQuery(
                        encryptedUrl,
                        `SELECT COUNT(*) AS c FROM "${safeName}"`
                    );
                    rowCount = parseInt(cr.rows[0]?.c ?? "0", 10);
                } catch { /* non-fatal */ }

                const columns = colsByTable.get(tableName) ?? [];

                // Sample values for low-cardinality string columns (helps LLM filter correctly)
                const stringCols = columns
                    .filter(c => ["character varying","varchar","text","char","bpchar","enum"].includes(c.type) && !c.isPrimary)
                    .slice(0, 4);

                if (stringCols.length > 0 && rowCount > 0 && rowCount <= 500000) {
                    try {
                        for (const col of stringCols) {
                            const sampleResult = await executeQuery(
                                encryptedUrl,
                                `SELECT DISTINCT "${col.name.replace(/"/g,'""')}"
                                 FROM "${safeName}"
                                 WHERE "${col.name.replace(/"/g,'""')}" IS NOT NULL
                                 ORDER BY 1 LIMIT 6`
                            );
                            const vals = sampleResult.rows
                                .map((r: any) => String(r[col.name] ?? "").slice(0, 30))
                                .filter(Boolean);
                            if (vals.length > 0 && vals.length <= 6) {
                                col.sampleValues = vals;
                            }
                        }
                    } catch { /* non-fatal */ }
                }

                return { name: tableName, rowCount, columns };
            })
        );

        return { tables, relationships };
    } catch (err: any) {
        console.error("[schemaContext] introspection error:", err.message);
        return { tables: [], relationships: [] };
    }
}

// ── Format schema as a detailed LLM-readable string ───────────────────────────
export function formatSchemaForLLM(schema: SchemaInfo): string {
    if (schema.tables.length === 0) return "";

    const lines: string[] = [];

    // Table definitions
    for (const table of schema.tables) {
        lines.push(`Table: "${table.name}" (${table.rowCount.toLocaleString()} rows)`);
        lines.push("Columns:");
        for (const col of table.columns) {
            const parts: string[] = [`  - ${col.name}: ${col.type}`];
            if (col.isPrimary)      parts.push("[PK]");
            if (col.isForeignKey && col.references) {
                parts.push(`[FK → ${col.references.table}.${col.references.column}]`);
            }
            if (!col.nullable)      parts.push("NOT NULL");
            if (col.sampleValues?.length) {
                parts.push(`(e.g. ${col.sampleValues.map(v => `'${v}'`).join(", ")})`);
            }
            lines.push(parts.join(" "));
        }
        lines.push("");
    }

    // Relationship summary — critical for JOIN generation
    if (schema.relationships.length > 0) {
        lines.push("FOREIGN KEY RELATIONSHIPS (use these for JOINs):");
        for (const rel of schema.relationships) {
            lines.push(
                `  "${rel.fromTable}".${rel.fromColumn} → "${rel.toTable}".${rel.toColumn}`
            );
        }
        lines.push("");
    }

    // Inferred relationship hints for common patterns
    const joinHints = buildJoinHints(schema);
    if (joinHints.length > 0) {
        lines.push("JOIN PATTERNS:");
        lines.join("\n");
        for (const hint of joinHints) lines.push(`  ${hint}`);
        lines.push("");
    }

    return lines.join("\n");
}

/** Generate concrete JOIN template hints from FK relationships */
function buildJoinHints(schema: SchemaInfo): string[] {
    return schema.relationships.map(rel =>
        `JOIN "${rel.toTable}" ON "${rel.fromTable}".${rel.fromColumn} = "${rel.toTable}".${rel.toColumn}`
    );
}

// ── Build the full system prompt for SQL generation ───────────────────────────
export function buildSQLSystemPrompt(
    dialect: string,
    schemaText: string
): string {
    const dialectInstructions: Record<string, string> = {
        postgresql: "Generate syntactically correct PostgreSQL. Use double-quoted identifiers only when names contain spaces or mixed case.",
        mysql:      "Generate syntactically correct MySQL. Use backtick-quoted identifiers. Never use PostgreSQL-specific functions.",
        sqlite:     "Generate syntactically correct SQLite. Use strftime() instead of DATE_TRUNC. Avoid ARRAY_AGG.",
    };
    const dialectHint = dialectInstructions[dialect] ?? dialectInstructions.postgresql;

    if (!schemaText) {
        return `You are a ${dialect.toUpperCase()} SQL expert.
${dialectHint}
Return ONLY the raw SQL SELECT query — no markdown, no code fences, no explanation.`;
    }

    return `You are a ${dialect.toUpperCase()} SQL expert with full access to the user's database schema.

CRITICAL RULES:
1. Use ONLY the table names and column names shown in the schema below — never invent names.
2. ${dialectHint}
3. Return ONLY the raw SQL query — NO markdown, NO code fences, NO explanation, NO comments.
4. For queries involving data from multiple tables, ALWAYS use JOINs based on the FOREIGN KEY RELATIONSHIPS listed below. Never guess join conditions.
5. When a query mentions entities from different tables (e.g. "orders with customer names", "employees in department X", "products sold to customer Y"), write a proper JOIN query.
6. If a Previous Query is provided, refine it to meet the new request.
7. Do NOT add LIMIT unless the user asks for a specific number of rows — show all relevant results.

DATABASE SCHEMA:
${schemaText}`;
}
