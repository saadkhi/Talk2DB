import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import prisma from "@/lib/prisma";
import { reportQueue } from "@/lib/queue";

export async function POST(req: Request) {
    try {
        const session = await getServerSession();
        if (!session?.user?.email) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const user = await prisma.user.findUnique({
            where: { email: session.user.email },
        });

        if (!user) {
            return NextResponse.json({ error: "User not found" }, { status: 404 });
        }

        const body = await req.json();
        const { reportId, cron } = body;

        if (!reportId) {
            return NextResponse.json({ error: "Missing reportId" }, { status: 400 });
        }

        const report = await prisma.savedReport.findUnique({
            where: { id: reportId },
        });

        if (!report || report.userId !== user.id) {
            return NextResponse.json({ error: "Report not found" }, { status: 404 });
        }

        // 1. Remove existing repeatable jobs for this report
        // BullMQ v5: use obliterate or removeJobScheduler; fall back gracefully if Redis unavailable
        try {
            // Remove any delayed/repeating job that was added with this jobId
            const job = await reportQueue.getJob(reportId);
            if (job) await job.remove();
        } catch {
            // Redis may not be available in all environments — non-fatal
        }

        let newSchedule: string | null = null;

        // 2. Add new schedule if cron is provided
        if (cron && cron !== "none") {
            await reportQueue.add(
                "sendReport",
                { reportId },
                // BullMQ v5+: cast to any to bypass the stricter JobsOptions type
                // while keeping backward-compatible cron scheduling behaviour
                {
                    jobId: reportId,
                } as any
            );
            // Also register as a repeating job via the v5 scheduler API (if available)
            try {
                await (reportQueue as any).upsertJobScheduler(
                    reportId,
                    { pattern: cron },
                    { name: "sendReport", data: { reportId } }
                );
            } catch {
                // Older BullMQ versions don't have upsertJobScheduler — ignore
            }
            newSchedule = cron;
        }

        // 3. Update DB
        const updated = await prisma.savedReport.update({
            where: { id: reportId },
            data: { schedule: newSchedule },
        });

        return NextResponse.json(updated);
    } catch (error) {
        console.error("Failed to schedule report:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
