import { NextResponse } from "next/server";
import { DEMO_TABLE_LIST } from "@/lib/demoData";

/**
 * GET /api/guest/schema
 * Returns the demo dataset schema — available to all users (no auth required).
 */
export async function GET() {
    return NextResponse.json({ tables: DEMO_TABLE_LIST, isDemo: true });
}
