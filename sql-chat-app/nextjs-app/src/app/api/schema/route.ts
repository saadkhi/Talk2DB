import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { executeQuery } from "@/lib/dbConnection";
import { resolveUserWithDb } from "@/lib/resolveUser";

/**
 * Introspect the user's connected database schema.
 * Uses executeQuery() so Neon serverless databases get a fresh Client
 * per query instead of a persistent Pool that goes stale.
 */
export async function getSchema(encryptedConnectionString: string) {
    // Fetch all public base tables
    const tablesResult = await executeQuery(
        encryptedConnectionString,
        `SELECT table_name
         FROM information_schema.tables
         WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
         ORDER BY table_name`
    );

    const tables = await Promise.all(
        tablesResult.rows.map(async (row: any) => {
            const tableName = row.table_name as string;
            const safeTable = tableName.replace(/'/g, "''");

            // Column metadata + primary key detection in one query
            const colResult = await executeQuery(
                encryptedConnectionString,
                `SELECT
                    c.column_name,
                    c.data_type,
                    c.is_nullable,
                    CASE WHEN kcu.column_name IS NOT NULL THEN true ELSE false END AS is_primary
                FROM information_schema.columns c
                LEFT JOIN (
                    SELECT kcu.column_name
                    FROM information_schema.key_column_usage kcu
                    JOIN information_schema.table_constraints tc
                        ON tc.constraint_name = kcu.constraint_name
                        AND tc.table_name = kcu.table_name
                    WHERE tc.constraint_type = 'PRIMARY KEY'
                        AND kcu.table_name = '${safeTable}'
                        AND kcu.table_schema = 'public'
                ) kcu ON kcu.column_name = c.column_name
                WHERE c.table_name = '${safeTable}' AND c.table_schema = 'public'
                ORDER BY c.ordinal_position`
            );

            // Row count
            const countResult = await executeQuery(
                encryptedConnectionString,
                `SELECT COUNT(*) AS count FROM "${tableName.replace(/"/g, '""')}"`
            );

            return {
                name: tableName,
                rowCount: parseInt(countResult.rows[0]?.count ?? "0", 10),
                columns: colResult.rows.map((c: any) => ({
                    name: c.column_name,
                    type: c.data_type,
                    nullable: c.is_nullable === "YES",
                    isPrimary: c.is_primary === true || c.is_primary === "true",
                })),
            };
        })
    );

    return { tables };
}

export async function GET() {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const user = await resolveUserWithDb(session);

        if (process.env.NODE_ENV !== "production") {
            console.log("[schema] resolved user:", user
                ? { id: user.id, email: user.email, hasDb: !!user.dbConnectionString }
                : null);
        }

        if (!user) {
            return NextResponse.json(
                { error: "Account not found. Please sign out and sign back in." },
                { status: 401 }
            );
        }
        if (!user.dbConnectionString) {
            return NextResponse.json(
                { error: "No DB connected. Click the 'Not Connected' button to add your database." },
                { status: 400 }
            );
        }

        const schema = await getSchema(user.dbConnectionString);
        return NextResponse.json(schema);
    } catch (error: any) {
        if (process.env.NODE_ENV !== "production") {
            console.error("Schema introspection error:", error);
        }
        return NextResponse.json(
            { error: error.message || "Failed to introspect schema" },
            { status: 500 }
        );
    }
}
