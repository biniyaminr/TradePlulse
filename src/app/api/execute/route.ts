export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
    try {
        // Dynamically import to prevent "window is not defined" error during Next.js static build
        const MetaApiModule = await import("metaapi.cloud-sdk");
        const MetaApi = MetaApiModule.default || MetaApiModule;
        const body = await req.json();
        const { symbol, action, volume, stopLoss, takeProfit } = body;

        if (!symbol || !action || volume === undefined) {
            return NextResponse.json(
                { error: "Missing required fields: symbol, action, volume" },
                { status: 400 }
            );
        }

        const token = process.env.META_API_TOKEN;
        const accountId = process.env.META_API_ACCOUNT_ID;

        if (!token || !accountId) {
            return NextResponse.json(
                { error: "Server missing MetaApi configuration (token or accountId)" },
                { status: 500 }
            );
        }

        // Initialize MetaApi Bridge
        const api = new MetaApi(token);
        const account = await api.metatraderAccountApi.getAccount(accountId);

        // Ensure the terminal is connected
        await account.waitConnected();

        const connection = account.getRPCConnection();
        await connection.connect();
        await connection.waitSynchronized();

        let tradeResult;

        if (action === "BUY") {
            // Options: symbol, volume, stopLoss, takeProfit
            tradeResult = await connection.createMarketBuyOrder(symbol, volume, stopLoss, takeProfit);
        } else if (action === "SELL") {
            tradeResult = await connection.createMarketSellOrder(symbol, volume, stopLoss, takeProfit);
        } else {
            return NextResponse.json(
                { error: "Action must be 'BUY' or 'SELL'" },
                { status: 400 }
            );
        }

        return NextResponse.json(
            {
                success: true,
                message: "Trade successfully executed",
                result: tradeResult
            },
            { status: 200 }
        );

    } catch (error: any) {
        console.error("MetaApi Error:", error);
        return NextResponse.json(
            {
                error: "Trade execution failed",
                details: error.message || error
            },
            { status: 500 }
        );
    }
}
