import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { getUserDbPool } from "@/lib/dbConnection";
import { resolveUserWithDb } from "@/lib/resolveUser";

export async function getSchema(encryptedConnectionString: string) {
    const pool = await getUserDbPool(encryptedConnectionString);

    const tablesResult = await pool.query(`
        SELECT table_name
        FROM information_schema.tables
        WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
        ORDER BY table_name
    `);

    const tables = await Promise.all(tablesResult.rows.map(async (row: any) => {
        const colResult = await pool.query(`
            SELECT
                c.column_name,
                c.data_type,
                c.is_nullable,
                CASE
                    WHEN kcu.column_name IS NOT NULL THEN true
                    ELSE false
                END AS is_primary
            FROM information_schema.columns c
            LEFT JOIN (
                SELECT kcu.column_name
                FROM information_schema.key_column_usage kcu
                JOIN information_schema.table_constraints tc
                    ON tc.constraint_name = kcu.constraint_name
                    AND tc.table_name = kcu.table_name
                WHERE tc.constraint_type = 'PRIMARY KEY'
                    AND kcu.table_name = $1
                    AND kcu.table_schema = 'public'
            ) kcu ON kcu.column_name = c.column_name
            WHERE c.table_name = $1 AND c.table_schema = 'public'
            ORDER BY c.ordinal_position
        `, [row.table_name]);

        const countResult = await pool.query(
            `SELECT COUNT(*) AS count FROM "${row.table_name}"`
        );

        return {
            name: row.table_name,
            rowCount: parseInt(countResult.rows[0].count, 10),
            columns: colResult.rows.map((c: any) => ({
                name: c.column_name,
                type: c.data_type,
                nullable: c.is_nullable === "YES",
                isPrimary: c.is_primary === true || c.is_primary === "true",
            })),
        };
    }));

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
            console.log("[schema] session.user.id:", (session.user as any).id);
            console.log("[schema] session.user.email:", session.user.email);
            console.log("[schema] resolved user:", user ? { id: user.id, email: user.email, hasDb: !!user.dbConnectionString } : null);
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
