import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";

export async function DELETE(
    _req: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const userId = (session.user as any).id;
        const { id } = await params;

        // Verify ownership before deleting
        const report = await prisma.savedReport.findUnique({ where: { id } });
        if (!report || report.userId !== userId) {
            return NextResponse.json({ error: "Report not found" }, { status: 404 });
        }

        await prisma.savedReport.delete({ where: { id } });
        return NextResponse.json({ message: "Report deleted" });
    } catch (error: any) {
        if (process.env.NODE_ENV !== "production") {
            console.error("Delete saved report error:", error);
        }
        return NextResponse.json(
            { error: error.message || "Failed to delete report" },
            { status: 500 }
        );
    }
}
