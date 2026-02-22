import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export const dynamic = "force-dynamic"; // Ensure this route is not statically cached

export async function GET() {
    try {
        // 1. Fetch all ACTIVE trades
        const activeTrades = await prisma.trade.findMany({
            where: { status: "ACTIVE" }
        });

        if (activeTrades.length === 0) {
            return NextResponse.json({ message: "No active trades to resolve", checked: 0, resolved: 0 });
        }

        // 2. Extract unique symbols
        const activeSymbols = Array.from(new Set(activeTrades.map(t => t.symbol)));

        // 3. Fetch live prices from TwelveData for these symbols
        const apiKey = process.env.NEXT_PUBLIC_WS_URL?.split("apikey=")[1]; // Reusing the key from the WS string
        if (!apiKey) {
            return NextResponse.json({ error: "Missing TwelveData API Key" }, { status: 500 });
        }

        const symbolQuery = activeSymbols.join(",");
        const tdResponse = await fetch(`https://api.twelvedata.com/price?symbol=${symbolQuery}&apikey=${apiKey}`);

        if (!tdResponse.ok) {
            return NextResponse.json({ error: "Failed to fetch prices from TwelveData" }, { status: 500 });
        }

        const priceData = await tdResponse.json();

        // If only one symbol was requested, TwelveData returns { price: "..." }
        // If multiple, it returns { "AAPL": { price: "..." }, "MSFT": { price: "..." } }
        const livePrices: Record<string, number> = {};

        if (activeSymbols.length === 1) {
            livePrices[activeSymbols[0]] = parseFloat(priceData.price);
        } else {
            for (const sym of activeSymbols) {
                if (priceData[sym] && priceData[sym].price) {
                    livePrices[sym] = parseFloat(priceData[sym].price);
                }
            }
        }

        let resolvedCount = 0;

        // 4. Hit Detection Logic
        for (const trade of activeTrades) {
            const currentPrice = livePrices[trade.symbol];
            if (!currentPrice || isNaN(currentPrice)) continue;

            let closedStatus: "WON" | "LOST" | null = null;
            let finalPrice = 0;

            if (trade.signal === "BUY") {
                if (currentPrice >= trade.tp) {
                    closedStatus = "WON";
                    finalPrice = trade.tp;
                } else if (currentPrice <= trade.sl) {
                    closedStatus = "LOST";
                    finalPrice = trade.sl;
                }
            } else if (trade.signal === "SELL") {
                if (currentPrice <= trade.tp) {
                    closedStatus = "WON";
                    finalPrice = trade.tp;
                } else if (currentPrice >= trade.sl) {
                    closedStatus = "LOST";
                    finalPrice = trade.sl;
                }
            }

            // 5. Update Portfolio & Trade if resolved
            if (closedStatus) {
                // Calculate PnL (Risk Amount is standard, either they lost it or won the R multiple)
                const isWin = closedStatus === "WON";

                // standardizing positionSize logic mapping to riskAmount
                // if riskAmount = $200 and they lose, pnl = -200
                // if they win, calculate Reward/Risk ratio
                const riskDist = Math.abs(trade.entry - trade.sl);
                const rewardDist = Math.abs(trade.entry - trade.tp);
                const rrRatio = riskDist > 0 ? (rewardDist / riskDist) : 1;

                const riskAmount = trade.riskAmount || 100; // default fallback if null
                const pnl = isWin ? (riskAmount * rrRatio) : -riskAmount;

                // Update Trade
                await prisma.trade.update({
                    where: { id: trade.id },
                    data: {
                        status: closedStatus,
                        pnl: pnl
                    }
                });

                // Update User Account Metrics
                const account = await prisma.account.findFirst({ where: { userId: trade.userId } });

                if (account) {
                    const newBalance = account.virtualBalance + pnl;
                    const newTotalTrades = account.totalTrades + 1;

                    // Recalculate Win Rate
                    // We need all closed trades for this user to calculate accurate win rate
                    const closedUserTrades = await prisma.trade.findMany({
                        where: { userId: account.userId, status: { in: ["WON", "LOST"] } }
                    });

                    // The query fetched currently closed trades BEFORE this loop iteration's update.
                    // We need to manually add the current won trade if applicable, or just re-query after.
                    // To be safe and deterministic, let's re-query considering the DB update just happened.
                    const updatedClosedTrades = await prisma.trade.findMany({
                        where: { userId: account.userId, status: { in: ["WON", "LOST"] } }
                    });

                    const wonTrades = updatedClosedTrades.filter(t => t.status === "WON").length;
                    const newWinRate = (wonTrades / newTotalTrades) * 100;

                    await prisma.account.update({
                        where: { id: account.id },
                        data: {
                            virtualBalance: newBalance,
                            totalTrades: newTotalTrades,
                            winRate: newWinRate
                        }
                    });
                }

                resolvedCount++;
            }
        }

        // 6. Return Stats
        return NextResponse.json({
            message: "Resolution engine executed successfully",
            checked: activeTrades.length,
            resolved: resolvedCount
        });

    } catch (error: any) {
        console.error("Resolution Engine Error:", error);
        return NextResponse.json({ error: "Failed to resolve trades", details: error.message }, { status: 500 });
    }
}
