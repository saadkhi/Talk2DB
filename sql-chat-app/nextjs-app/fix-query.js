const fs = require('fs');
let content = fs.readFileSync('src/app/api/query/run/route.ts', 'utf8');

// Imports
content = content.replace('import { executeQuery } from "@/lib/dbConnection";', 'import { executeQuery, executeMultiQuery } from "@/lib/dbConnection";');
content = content.replace('import { isSQLSafe, extractSQL } from "@/lib/sqlSafety";', 'import { isSQLSafe, extractSQL, splitSqlStatements } from "@/lib/sqlSafety";');

// the logic inside POST
const target = `        // Extract from markdown blocks if the user pasted wrapped SQL
        const sql = extractSQL(rawSql.trim());
        const cleanSql = sql.replace(/;\\s*$/, "").trim();

        if (!cleanSql) {
            return NextResponse.json({ error: "SQL is empty after parsing." }, { status: 400 });
        }

        if (!isSQLSafe(cleanSql)) {
            return NextResponse.json({
                error: "Query contains unsafe operations. Only SELECT queries are allowed."
            }, { status: 400 });
        }

        const safeSql = /\\bLIMIT\\b/i.test(cleanSql) ? cleanSql : \`\${cleanSql} LIMIT 500\`;

        try {
            const { columns, rows } = await executeQuery(user.dbConnectionString, safeSql);

            // ── Guardrail: zero results with WHERE filters ────────────────────
            let guardrail: QueryGuardrail | null = null;
            if (rows.length === 0 && /\\bWHERE\\b/i.test(safeSql)) {
                guardrail = await buildGuardrail(safeSql, user.dbConnectionString);
            }

            return NextResponse.json({ sql: safeSql, columns, rows, guardrail });
        } catch (dbError: any) {
            return NextResponse.json({ error: dbError.message, sql: safeSql }, { status: 422 });
        }`;

const replacement = `        // Extract from markdown blocks if the user pasted wrapped SQL
        const sql = extractSQL(rawSql.trim());
        const cleanSql = sql.replace(/;\\s*$/, "").trim();

        if (!cleanSql) {
            return NextResponse.json({ error: "SQL is empty after parsing." }, { status: 400 });
        }

        const statements = splitSqlStatements(cleanSql);
        for (const stmt of statements) {
            if (!isSQLSafe(stmt)) {
                return NextResponse.json({
                    error: "Query contains unsafe operations. Only SELECT queries are allowed."
                }, { status: 400 });
            }
        }

        const safeStatements = statements.map(stmt => {
            return /\\bLIMIT\\b/i.test(stmt) ? stmt : \`\${stmt} LIMIT 500\`;
        });
        const safeSql = safeStatements.join(";\\n");

        try {
            const results = await executeMultiQuery(user.dbConnectionString, safeSql);

            // ── Guardrail: zero results with WHERE filters ────────────────────
            // Only generate guardrail for the first statement if it has zero rows
            let guardrail: QueryGuardrail | null = null;
            if (results.length > 0 && results[0].rows.length === 0 && /\\bWHERE\\b/i.test(safeStatements[0])) {
                guardrail = await buildGuardrail(safeStatements[0], user.dbConnectionString);
            }

            // To maintain compatibility with single query, return the first result at the top level
            // but also include all results in a \`results\` array.
            const primary = results[0] || { columns: [], rows: [] };

            return NextResponse.json({ 
                sql: safeSql, 
                columns: primary.columns, 
                rows: primary.rows, 
                guardrail,
                results // Array of { columns, rows } for script mode
            });
        } catch (dbError: any) {
            return NextResponse.json({ error: dbError.message, sql: safeSql }, { status: 422 });
        }`;

content = content.replace(target, replacement);
fs.writeFileSync('src/app/api/query/run/route.ts', content);
