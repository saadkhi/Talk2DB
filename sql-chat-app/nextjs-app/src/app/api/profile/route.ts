import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { getUserDbPool } from "@/lib/dbConnection";

export async function POST(req: Request) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { tableName } = await req.json();
        if (!tableName || !/^[a-zA-Z0-9_]+$/.test(tableName)) {
            return NextResponse.json({ error: "Invalid table name format" }, { status: 400 });
        }

        const userId = (session.user as any).id;
        const user = await prisma.user.findUnique({ where: { id: userId } });
        if (!user?.dbConnectionString) {
            return NextResponse.json({ error: "No database connected" }, { status: 400 });
        }

        const pool = await getUserDbPool(user.dbConnectionString);

        // Get total rows cleanly
        const totalResult = await pool.query(`SELECT COUNT(*) as count FROM "${tableName}"`);
        const totalRows = parseInt(totalResult.rows[0].count);

        // Get database column data types
        const colsResult = await pool.query(
            `
      SELECT column_name, data_type FROM information_schema.columns
      WHERE table_name = $1 AND table_schema = 'public' ORDER BY ordinal_position
    `,
            [tableName]
        );

        const columns = await Promise.all(
            colsResult.rows.map(async (col: any) => {
                const { column_name, data_type } = col;

                // Null checks
                const nullResult = await pool.query(
                    `SELECT COUNT(*) as nulls FROM "${tableName}" WHERE "${column_name}" IS NULL`
                );
                const nullCount = parseInt(nullResult.rows[0].nulls);
                const nullPct = totalRows > 0 ? Math.round((nullCount / totalRows) * 100) : 0;

                // Distinct checks
                const distinctResult = await pool.query(
                    `SELECT COUNT(DISTINCT "${column_name}") as distinct_count FROM "${tableName}"`
                );
                const distinctCount = parseInt(distinctResult.rows[0].distinct_count);

                let stats: any = { nullCount, nullPct, distinctCount };

                // Analyze specific data types
                const numericTypes = ["integer", "bigint", "numeric", "real", "double precision", "smallint", "decimal"];
                if (numericTypes.includes(data_type)) {
                    try {
                        const numResult = await pool.query(
                            `SELECT MIN("${column_name}") as min, MAX("${column_name}") as max, AVG("${column_name}") as avg FROM "${tableName}"`
                        );
                        stats = {
                            ...stats,
                            min: numResult.rows[0].min != null ? Number(numResult.rows[0].min) : null,
                            max: numResult.rows[0].max != null ? Number(numResult.rows[0].max) : null,
                            avg: numResult.rows[0].avg != null ? Number(numResult.rows[0].avg) : null,
                        };
                    } catch (eNum) {
                        if (process.env.NODE_ENV !== 'production') {
                            console.warn(`Numeric profiling statistical calculation failed for ${column_name}:`, eNum);
                        }
                    }
                }

                const stringTypes = ["character varying", "varchar", "text", "char", "character"];
                if (stringTypes.includes(data_type)) {
                    try {
                        const topResult = await pool.query(
                            `SELECT "${column_name}" as value, COUNT(*) as count 
               FROM "${tableName}" 
               WHERE "${column_name}" IS NOT NULL 
               GROUP BY "${column_name}" 
               ORDER BY count DESC LIMIT 5`
                        );
                        stats.topValues = topResult.rows.map((r: any) => ({
                            value: String(r.value),
                            count: parseInt(r.count),
                        }));
                    } catch (eStr) {
                        console.warn(`String profiling top-value calculation failed for ${column_name}:`, eStr);
                    }
                }

                const dateTypes = ["date", "timestamp", "timestamp without time zone", "timestamp with time zone"];
                if (dateTypes.includes(data_type)) {
                    try {
                        const dateResult = await pool.query(
                            `SELECT MIN("${column_name}") as min_date, MAX("${column_name}") as max_date FROM "${tableName}"`
                        );
                        stats = {
                            ...stats,
                            min_date: dateResult.rows[0].min_date,
                            max_date: dateResult.rows[0].max_date,
                        };
                    } catch (eDate) {
                        console.warn(`Date profiling statistical calculation failed for ${column_name}:`, eDate);
                    }
                }

                // Auto anomaly flags detection
                const anomalies: string[] = [];
                if (nullPct > 50) {
                    anomalies.push("High Null Percentage (>50%)");
                }
                if (distinctCount === 1 && totalRows > 1) {
                    anomalies.push("Single Cardinality (entire column contains only one distinct value)");
                }
                if (distinctCount === totalRows && totalRows > 1 && !column_name.toLowerCase().includes("id")) {
                    anomalies.push("High Cardinality (potential unique index candidates)");
                }

                return {
                    name: column_name,
                    type: data_type,
                    anomalies,
                    ...stats,
                };
            })
        );

        return NextResponse.json({
            tableName,
            totalRows,
            columns,
        });
    } catch (error: any) {
        if (process.env.NODE_ENV !== 'production') {
            console.error("Table Profiler compilation error:", error);
        }
        return NextResponse.json({ error: error.message || "Failed compiler data profiles" }, { status: 500 });
    }
}
