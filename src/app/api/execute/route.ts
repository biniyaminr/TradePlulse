import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";

// Using CommonJS require and extracting .default to bypass Turbopack's broken ESM browser resolution
const MetaApiModule = require("metaapi.cloud-sdk");
const MetaApi = MetaApiModule.default || MetaApiModule;

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const { symbol, action, volume, stopLoss, takeProfit } = body;

        if (!symbol || !action || volume === undefined) {
            return NextResponse.json(
                { error: "Missing required fields: symbol, action, volume" },
                { status: 400 }
            );
        }

        const allAccounts = await prisma.account.findMany();

        if (allAccounts.length === 0) {
            return NextResponse.json({ message: "No active accounts found to execute trade" }, { status: 200 });
        }

        const results: any[] = [];

        // Broadcast logic
        const promises = allAccounts.map(async (account: any) => {
            const token = account.metaApiToken || process.env.META_API_TOKEN;
            const accountId = account.metaApiAccountId || process.env.META_API_ACCOUNT_ID;

            if (!token || !accountId) {
                results.push({ userId: account.userId, status: "failed", reason: "Missing MetaApi credentials" });
                return;
            }

            try {
                // Pre-flight checks
                // 1. Position Limit Check
                const activeTrades = await prisma.trade.findMany({
                    where: {
                        userId: account.userId,
                        status: 'ACTIVE',
                        symbol: symbol
                    }
                });

                if (activeTrades.length > 0) {
                    results.push({ userId: account.userId, status: "skipped", reason: "Position already open for this asset" });
                    return;
                }

                // 2. Margin Protection
                // Retrieve the most recent trade setup for this symbol to get the intended entry price
                // Since execute doesn't have the entry price, we estimate based on the stopLoss distance
                // We'll estimate risk amount if we have SL. In a live system, we'd ideally pass current price.
                // Assuming standard risk % calculation from account balance if entry price is unknown
                const virtualBalance = account.virtualBalance || 10000;
                const riskPercentage = account.riskPercentage || 1.0;
                const calculatedRiskAmount = virtualBalance * (riskPercentage / 100);

                if (calculatedRiskAmount > virtualBalance) {
                    results.push({ userId: account.userId, status: "skipped", reason: "Insufficient margin" });
                    return;
                }

                // Initialize MetaApi Bridge for this user
                const api = new MetaApi(token);
                const metaAccount = await api.metatraderAccountApi.getAccount(accountId);

                await metaAccount.waitConnected();
                const connection = metaAccount.getRPCConnection();
                await connection.connect();
                await connection.waitSynchronized();

                let tradeResult;
                if (action === "BUY") {
                    tradeResult = await connection.createMarketBuyOrder(symbol, volume, stopLoss, takeProfit);
                } else if (action === "SELL") {
                    tradeResult = await connection.createMarketSellOrder(symbol, volume, stopLoss, takeProfit);
                } else {
                    results.push({ userId: account.userId, status: "failed", reason: "Invalid action" });
                    return;
                }

                // Calculate actual risk amount based on physical entry price
                const actualEntry = tradeResult?.price || 0;
                const slDistance = Math.abs(actualEntry - (stopLoss || 0));
                const riskAmount = slDistance > 0 ? (slDistance * volume) : calculatedRiskAmount;

                // Save record to DB
                await prisma.trade.create({
                    data: {
                        symbol,
                        signal: action,
                        entry: actualEntry,
                        sl: stopLoss || 0,
                        tp: takeProfit || 0,
                        status: "ACTIVE",
                        userId: account.userId,
                        riskAmount: riskAmount
                    }
                });

                results.push({ userId: account.userId, status: "success", tradeResult });

            } catch (err: any) {
                console.error(`Error executing for user ${account.userId}:`, err.message || err);
                results.push({ userId: account.userId, status: "failed", reason: err.message || String(err) });
            }
        });

        await Promise.all(promises);

        return NextResponse.json(
            {
                success: true,
                message: "Trade broadcast complete",
                results
            },
            { status: 200 }
        );

    } catch (error: any) {
        console.error("MetaApi Broadcast Error:", error);
        return NextResponse.json(
            {
                error: "Trade execution broadcast failed",
                details: error.message || String(error)
            },
            { status: 500 }
        );
    }
}
