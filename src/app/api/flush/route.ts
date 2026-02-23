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
                status: "ACTIVE",
                userId: userId // Only flush the acting user's trades
            }
        });

        return NextResponse.json({
            success: true,
            message: `Successfully flushed ${deleteResult.count} active trades.`,
            count: deleteResult.count
        }, { status: 200 });

    } catch (error: any) {
        console.error("Flush Route Error:", error);
        return NextResponse.json({ error: "Emergency flush failed", details: error.message }, { status: 500 });
    }
}
