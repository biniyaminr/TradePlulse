export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import prisma from "@/lib/prisma";

export async function GET(req: Request) {
    try {
        const { userId } = await auth();
        if (!userId) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const account = await prisma.account.findFirst({ where: { userId } });
        return NextResponse.json({ success: true, account });
    } catch (error: any) {
        console.error("Account Fetch Error:", error);
        return NextResponse.json({ error: error.message || "Failed to fetch account" }, { status: 500 });
    }
}

export async function POST(req: Request) {
    try {
        const { userId } = await auth();
        if (!userId) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const body = await req.json();
        const { newBalance, riskPercentage, metaApiToken, metaApiAccountId } = body;

        if (newBalance !== undefined && (typeof newBalance !== "number" || newBalance < 0)) {
            return NextResponse.json({ error: "Invalid balance value" }, { status: 400 });
        }
        if (riskPercentage !== undefined && (typeof riskPercentage !== "number" || riskPercentage <= 0 || riskPercentage > 100)) {
            return NextResponse.json({ error: "Invalid risk percentage" }, { status: 400 });
        }

        const account = await prisma.account.findFirst({ where: { userId } });

        const dataToUpdate: any = {};
        if (newBalance !== undefined) dataToUpdate.virtualBalance = newBalance;
        if (riskPercentage !== undefined) dataToUpdate.riskPercentage = riskPercentage;
        if (metaApiToken !== undefined) dataToUpdate.metaApiToken = metaApiToken;
        if (metaApiAccountId !== undefined) dataToUpdate.metaApiAccountId = metaApiAccountId;

        if (!account) {
            await prisma.account.create({
                data: {
                    virtualBalance: newBalance ?? 10000,
                    riskPercentage: riskPercentage ?? 1.0,
                    winRate: 0,
                    totalTrades: 0,
                    userId,
                    metaApiToken,
                    metaApiAccountId
                }
            });
        } else if (Object.keys(dataToUpdate).length > 0) {
            await prisma.account.update({
                where: { id: account.id },
                data: dataToUpdate
            });
        }

        return NextResponse.json({ success: true, newBalance, riskPercentage, metaApiToken, metaApiAccountId });

    } catch (error: any) {
        console.error("Account Update Error:", error);
        return NextResponse.json({ error: error.message || "Failed to update account" }, { status: 500 });
    }
}
