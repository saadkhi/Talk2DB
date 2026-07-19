import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { getUserDbPool } from "@/lib/dbConnection";

const MAX_ROWS = 500;

export async function GET(req: Request) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { searchParams } = new URL(req.url);
        const table  = searchParams.get("table");
        const page   = Math.max(0, parseInt(searchParams.get("page")  || "0", 10));
        const limit  = Math.min(MAX_ROWS, Math.max(1, parseInt(searchParams.get("limit") || "50", 10)));
        const offset = page * limit;

        // Validate table name — only allow safe identifiers
        if (!table || !/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(table)) {
            return NextResponse.json({ error: "Invalid table name" }, { status: 400 });
        }

        // Resolve user
        const userId = (session.user as any).id;
        const email  = session.user?.email;

        let user = userId
            ? await prisma.user.findUnique({ where: { id: userId }, select: { dbConnectionString: true } })
            : null;

        if (!user && email) {
            user = await prisma.user.findUnique({ where: { email }, select: { dbConnectionString: true } });
        }

        if (!user?.dbConnectionString) {
            return NextResponse.json({ error: "No database connected" }, { status: 400 });
        }

        const pool = await getUserDbPool(user.dbConnectionString);

        // Total count
        const countResult = await pool.query(`SELECT COUNT(*) AS count FROM "${table}"`);
        const totalRows = parseInt(countResult.rows[0].count, 10);

        // Paginated rows
        const dataResult = await pool.query(
            `SELECT * FROM "${table}" LIMIT $1 OFFSET $2`,
            [limit, offset]
        );

        const columns = dataResult.fields.map((f: any) => f.name);
        const rows    = dataResult.rows;

        return NextResponse.json({
            table,
            totalRows,
            page,
            limit,
            totalPages: Math.ceil(totalRows / limit),
            columns,
            rows,
        });
    } catch (error: any) {
        if (process.env.NODE_ENV !== "production") {
            console.error("Table data fetch error:", error);
        }
        return NextResponse.json(
            { error: error.message || "Failed to fetch table data" },
            { status: 500 }
        );
    }
}
