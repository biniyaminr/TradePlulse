export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import prisma from "@/lib/prisma";

export async function GET() {
    try {
        const { userId } = await auth();
        if (!userId) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const deleteResult = await prisma.trade.deleteMany({
            where: {
                userId: userId // Entire slate wipe for the acting user
            }
        });

        const updateResult = await prisma.account.updateMany({
            where: {
                userId: userId
            },
            data: {
                virtualBalance: 54.00,
                winRate: 0,
                totalTrades: 0
            }
        });

        return NextResponse.json({
            success: true,
            message: `Successfully flushed ${deleteResult.count} trades and reset portfolio.`,
            deletedCount: deleteResult.count,
            accountsReset: updateResult.count
        }, { status: 200 });

    } catch (error: any) {
        console.error("Flush Route Error:", error);
        return NextResponse.json({ error: "Emergency flush failed", details: error.message }, { status: 500 });
    }
}
