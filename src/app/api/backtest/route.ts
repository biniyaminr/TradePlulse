import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import prisma from "@/lib/prisma";

export async function POST(req: Request) {
    try {
        const { userId } = await auth();
        if (!userId) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const body = await req.json();
        const { asset, timeframe } = body;

        if (!asset || !timeframe) {
            return NextResponse.json({ error: "Missing asset or timeframe" }, { status: 400 });
        }

        // Fetch historical data from TwelveData
        const apiKey = "a258988b42e3441c9996d769924d0793"; // Hardcoded from .env.local for backend call
        const encodedAsset = encodeURIComponent(asset);
        // Map common timeframes
        const intervalMap: Record<string, string> = {
            "1h": "1h",
            "4h": "4h",
            "1d": "1day"
        };
        const interval = intervalMap[timeframe] || "4h";

        const tdUrl = `https://api.twelvedata.com/time_series?symbol=${encodedAsset}&interval=${interval}&outputsize=250&apikey=${apiKey}`;
        const tdRes = await fetch(tdUrl);
        const tdData = await tdRes.json();

        if (tdData.status === "error") {
            return NextResponse.json({ error: tdData.message }, { status: 500 });
        }

        if (!tdData.values || tdData.values.length === 0) {
            return NextResponse.json({ error: "No historical data available for this asset/timeframe" }, { status: 404 });
        }

        // TwelveData returns newest to oldest. We need oldest to newest.
        const candles = tdData.values.reverse();

        // ─── Quantitative Backtest Simulation (ICC 1:4 R/R Strategy) ───

        let initialBalance = 10000;
        let currentBalance = initialBalance;
        let peakBalance = initialBalance;
        let maxDrawdown = 0;
        let wins = 0;
        let losses = 0;

        const simulatedTrades = [];
        let activeTrade: any = null;

        for (const candle of candles) {
            const high = parseFloat(candle.high);
            const low = parseFloat(candle.low);
            const close = parseFloat(candle.close);
            const open = parseFloat(candle.open);

            if (activeTrade) {
                // Check if trade closes
                if (activeTrade.signal === "LONG") {
                    if (low <= activeTrade.sl) {
                        // Stopped out
                        const loss = activeTrade.riskValue;
                        currentBalance -= loss;
                        losses++;
                        activeTrade.status = "LOST";
                        activeTrade.pnl = -loss;
                        activeTrade.exitDate = candle.datetime;
                        simulatedTrades.push({ ...activeTrade });
                        activeTrade = null;
                    } else if (high >= activeTrade.tp) {
                        // Take profit
                        const profit = activeTrade.riskValue * 4; // 1:4 R/R
                        currentBalance += profit;
                        wins++;
                        activeTrade.status = "WON";
                        activeTrade.pnl = profit;
                        activeTrade.exitDate = candle.datetime;
                        simulatedTrades.push({ ...activeTrade });
                        activeTrade = null;
                    }
                } else if (activeTrade.signal === "SHORT") {
                    if (high >= activeTrade.sl) {
                        // Stopped out
                        const loss = activeTrade.riskValue;
                        currentBalance -= loss;
                        losses++;
                        activeTrade.status = "LOST";
                        activeTrade.pnl = -loss;
                        activeTrade.exitDate = candle.datetime;
                        simulatedTrades.push({ ...activeTrade });
                        activeTrade = null;
                    } else if (low <= activeTrade.tp) {
                        // Take profit
                        const profit = activeTrade.riskValue * 4; // 1:4 R/R
                        currentBalance += profit;
                        wins++;
                        activeTrade.status = "WON";
                        activeTrade.pnl = profit;
                        activeTrade.exitDate = candle.datetime;
                        simulatedTrades.push({ ...activeTrade });
                        activeTrade = null;
                    }
                }

                // Track Drawdown
                if (currentBalance > peakBalance) {
                    peakBalance = currentBalance;
                }
                const drawDownPercent = ((peakBalance - currentBalance) / peakBalance) * 100;
                if (drawDownPercent > maxDrawdown) {
                    maxDrawdown = drawDownPercent;
                }
            } else {
                // Look for strictly ICC setup (Strong momentum body)
                const bodySize = Math.abs(close - open);
                const candleRange = high - low;

                // Needs to be a strong candle (body > 65% of entire range)
                if (candleRange > 0 && bodySize > candleRange * 0.65) {
                    // Constant 1% risk of current balance
                    const riskValue = currentBalance * 0.01;

                    if (close > open) {
                        // Bullish engulfing / momentum -> LONG
                        const sl = low - (candleRange * 0.1); // buffer below low
                        const riskAmount = close - sl;
                        if (riskAmount > 0) {
                            const tp = close + (riskAmount * 4); // Strict 1:4 R/R
                            activeTrade = {
                                symbol: asset,
                                signal: "LONG",
                                entryDate: candle.datetime,
                                entry: close,
                                sl,
                                tp,
                                riskValue,
                                status: "ACTIVE"
                            };
                        }
                    } else {
                        // Bearish engulfing / momentum -> SHORT
                        const sl = high + (candleRange * 0.1); // buffer above high
                        const riskAmount = sl - close;
                        if (riskAmount > 0) {
                            const tp = close - (riskAmount * 4); // Strict 1:4 R/R
                            activeTrade = {
                                symbol: asset,
                                signal: "SHORT",
                                entryDate: candle.datetime,
                                entry: close,
                                sl,
                                tp,
                                riskValue,
                                status: "ACTIVE"
                            };
                        }
                    }
                }
            }
        }

        const totalTrades = wins + losses;
        const winRate = totalTrades > 0 ? (wins / totalTrades) * 100 : 0;
        const totalPnL = currentBalance - initialBalance;

        // Profit factor: (Gross Wins) / (Gross Losses) - roughly 4.0 if win rate is perfect, but we calculate actuals via counts
        let grossProfit = 0;
        let grossLoss = 0;
        simulatedTrades.forEach(t => {
            if (t.pnl > 0) grossProfit += t.pnl;
            else if (t.pnl < 0) grossLoss += Math.abs(t.pnl);
        });

        const profitFactor = grossLoss > 0 ? grossProfit / grossLoss : (grossProfit > 0 ? 99.9 : 0);

        // Save backtest run to database
        const run = await prisma.backtestRun.create({
            data: {
                userId,
                asset,
                timeframe,
                totalPnL,
                winRate,
                profitFactor,
                maxDrawdown
            }
        });

        // Return the run and descending list of trades
        return NextResponse.json({
            run,
            trades: simulatedTrades.reverse()
        });

    } catch (error: any) {
        console.error("Backtest Error:", error);
        return NextResponse.json({ error: "Failed to run backtest simulation" }, { status: 500 });
    }
}
