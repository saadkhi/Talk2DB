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

        // 1. Remove existing schedule if any
        const repeatableJobs = await reportQueue.getRepeatableJobs();
        for (const job of repeatableJobs) {
            if (job.id === reportId) {
                await reportQueue.removeRepeatableByKey(job.key);
            }
        }

        let newSchedule = null;

        // 2. Add new schedule if cron is provided
        if (cron && cron !== "none") {
            await reportQueue.add(
                "sendReport", 
                { reportId }, 
                { 
                    repeat: { pattern: cron },
                    jobId: reportId, // use reportId to easily find/remove it later
                }
            );
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
