import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { getUserDbPool } from "@/lib/dbConnection";

export async function getSchema(encryptedConnectionString: string) {
    const pool = await getUserDbPool(encryptedConnectionString);

    // PostgreSQL schema introspection
    const tablesResult = await pool.query(`
    SELECT table_name FROM information_schema.tables
    WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
    ORDER BY table_name
  `);

    const tables = await Promise.all(tablesResult.rows.map(async (row: any) => {
        const colResult = await pool.query(`
      SELECT column_name, data_type, is_nullable,
        CASE WHEN column_name IN (
          SELECT kcu.column_name FROM information_schema.key_column_usage kcu
          JOIN information_schema.table_constraints tc ON tc.constraint_name = kcu.constraint_name
          WHERE tc.constraint_type = 'PRIMARY KEY' AND kcu.table_name = $1
        ) THEN true ELSE false END as is_primary
      FROM information_schema.columns
      WHERE table_name = $1 AND table_schema = 'public'
      ORDER BY ordinal_position
    `, [row.table_name]);

        const countResult = await pool.query(`SELECT COUNT(*) as count FROM "${row.table_name}"`);

        return {
            name: row.table_name,
            rowCount: parseInt(countResult.rows[0].count),
            columns: colResult.rows.map((c: any) => ({
                name: c.column_name,
                type: c.data_type,
                nullable: c.is_nullable === "YES",
                isPrimary: c.is_primary,
            })),
        };
    }));

    return { tables };
}

export async function GET(req: Request) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const userId = (session.user as any).id;
        const user = await prisma.user.findUnique({ where: { id: userId } });
        if (!user?.dbConnectionString) {
            return NextResponse.json({ error: "No DB connected" }, { status: 400 });
        }

        const schema = await getSchema(user.dbConnectionString);
        return NextResponse.json(schema);
    } catch (error: any) {
        console.error("Schema introspection API error:", error);
        return NextResponse.json({ error: error.message || "Failed to introspect SQL schema" }, { status: 500 });
    }
}
