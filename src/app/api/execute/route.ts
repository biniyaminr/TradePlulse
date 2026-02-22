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

                // Save record to DB
                await prisma.trade.create({
                    data: {
                        symbol,
                        signal: action,
                        entry: tradeResult?.price || 0,
                        sl: stopLoss || 0,
                        tp: takeProfit || 0,
                        status: "ACTIVE",
                        userId: account.userId
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
