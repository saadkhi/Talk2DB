import { NextResponse } from "next/server";
import { runDemoQuery } from "@/lib/demoData";

/**
 * POST /api/guest/query
 * Executes a simple SELECT against the in-memory demo dataset.
 * No authentication required — intended for guest/unauthenticated users.
 *
 * Body: { sql: string }
 * Response: { columns, rows, isDemo: true }
 */
export async function POST(req: Request) {
    try {
        const { sql } = await req.json();
        if (!sql?.trim()) {
            return NextResponse.json({ error: "SQL is required" }, { status: 400 });
        }

        const { columns, rows } = runDemoQuery(sql);
        return NextResponse.json({ columns, rows, isDemo: true });
    } catch (err: any) {
        return NextResponse.json(
            { error: err.message || "Demo query failed" },
            { status: 422 }
        );
    }
}
