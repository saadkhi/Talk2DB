/**
 * POST /api/report/schedule
 *
 * Saves a cron schedule string on a SavedReport record. The actual job
 * scheduling is handled by the standalone worker process (src/worker.ts)
 * which reads this field and manages the BullMQ queue independently.
 *
 * This route intentionally does NOT import BullMQ — that package depends
 * on ioredis which cannot be bundled by Next.js / Vercel's serverless build.
 */
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { resolveUserId } from "@/lib/resolveUser";

const VALID_CRON = /^(\*|[0-9,\-*/]+)\s+(\*|[0-9,\-*/]+)\s+(\*|[0-9,\-*/]+)\s+(\*|[0-9,\-*/]+)\s+(\*|[0-9,\-*/]+)$/;

export async function POST(req: Request) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const userId = await resolveUserId(session);
        if (!userId) {
            return NextResponse.json({ error: "User not found" }, { status: 400 });
        }

        const body = await req.json();
        const { reportId, cron } = body;

        if (!reportId) {
            return NextResponse.json({ error: "Missing reportId" }, { status: 400 });
        }

        // Validate cron string (or accept "none" to clear)
        let newSchedule: string | null = null;
        if (cron && cron !== "none") {
            if (!VALID_CRON.test(cron.trim())) {
                return NextResponse.json({ error: "Invalid cron expression" }, { status: 400 });
            }
            newSchedule = cron.trim();
        }

        const report = await prisma.savedReport.findUnique({
            where: { id: reportId },
            select: { id: true, userId: true },
        });

        if (!report) {
            return NextResponse.json({ error: "Report not found" }, { status: 404 });
        }
        if (report.userId !== userId) {
            return NextResponse.json({ error: "Forbidden" }, { status: 403 });
        }

        const updated = await prisma.savedReport.update({
            where: { id: reportId },
            data: { schedule: newSchedule },
        });

        return NextResponse.json(updated);
    } catch (error: any) {
        console.error("Failed to update report schedule:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
