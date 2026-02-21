import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function POST(req: Request) {
    try {
        const body = await req.json();
        const { prices } = body;

        if (!prices || typeof prices !== "object") {
            return NextResponse.json({ error: "Missing or invalid prices object" }, { status: 400 });
        }

        // 1. Get or create the unified Account
        let account = await prisma.account.findFirst();
        if (!account) {
            account = await prisma.account.create({
                data: { virtualBalance: 10000, riskPercentage: 1.0, winRate: 0, totalTrades: 0 } as any
            });
        }

        // 2. Fetch all ACTIVE trades
        const activeTrades = await prisma.trade.findMany({ where: { status: "ACTIVE" } });

        let updatedCount = 0;
        let pnlTotal = 0;

        for (const trade of activeTrades) {
            const currentPrice = prices[trade.symbol];
            if (!currentPrice) continue; // No price data for this asset right now

            let newStatus: "WON" | "LOST" | null = null;

            if (trade.signal === "BUY") {
                if (currentPrice >= trade.tp) newStatus = "WON";
                else if (currentPrice <= trade.sl) newStatus = "LOST";
            } else if (trade.signal === "SELL") {
                if (currentPrice <= trade.tp) newStatus = "WON";
                else if (currentPrice >= trade.sl) newStatus = "LOST";
            }

            if (newStatus) {
                // Determine PnL based on the exact risk locked-in at entry.
                // Fallback to dynamic risk of current balance only for legacy trades.
                const riskAmount = trade.riskAmount ?? (account.virtualBalance * (account.riskPercentage / 100));
                let pnl = 0;

                if (newStatus === "WON") {
                    const slDistance = Math.abs(trade.entry - trade.sl);
                    const tpDistance = Math.abs(trade.tp - trade.entry);
                    const rr = slDistance > 0 ? tpDistance / slDistance : 0;
                    pnl = riskAmount * rr;
                } else {
                    pnl = -riskAmount;
                }

                // Update individual trade
                await prisma.trade.update({
                    where: { id: trade.id },
                    data: { status: newStatus, pnl }
                });

                pnlTotal += pnl;
                updatedCount++;
            }
        }

        if (updatedCount > 0) {
            // 3. Update Account aggregates
            const newBalance = account.virtualBalance + pnlTotal;

            // Recalculate global win rate for accuracy
            const allClosed = await prisma.trade.findMany({
                where: { status: { in: ["WON", "LOST"] } }
            });
            const totalWins = allClosed.filter(t => t.status === "WON").length;
            const totalClosed = allClosed.length;
            const winRate = totalClosed > 0 ? (totalWins / totalClosed) * 100 : 0;

            account = await prisma.account.update({
                where: { id: account.id },
                data: {
                    virtualBalance: newBalance,
                    totalTrades: totalClosed,
                    winRate
                }
            });
        }

        return NextResponse.json({ success: true, updatedCount, account });

    } catch (error: any) {
        console.error("Simulation Error:", error);
        return NextResponse.json({ error: error.message || "Simulation failed" }, { status: 500 });
    }
}
