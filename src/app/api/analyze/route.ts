import { NextRequest, NextResponse } from "next/server";
import { GoogleGenAI } from "@google/genai";
import prisma from "@/lib/prisma";

// ─── Types ────────────────────────────────────────────────────────────────────

interface SwingPoint {
    type: "peak" | "trough";
    price: number;
    index: number;
}

interface AnalyzeRequestBody {
    signal: "BUY" | "SELL";
    currentPrice: number;
    symbol: string;
    swingPoints: SwingPoint[];
}

interface TradeSetup {
    entry: number;
    sl: number;
    tp: number;
}

// ─── Prompt factory ───────────────────────────────────────────────────────────

function buildPrompt(
    signal: "BUY" | "SELL",
    symbol: string,
    currentPrice: number,
    swingPoints: SwingPoint[]
): string {
    return `You are an expert quantitative swing trader and market analyst. You do not guess; you execute mathematical probabilities based STRICTLY on the ICC (Indication, Correction, Continuation) market structure.

Here is your absolute market logic:

BUY SETUP: Indication (Higher High) -> Correction (Higher Low) -> Continuation (Going to make Higher High).

SELL SETUP: Indication (Lower Low) -> Correction (Lower High) -> Continuation (Going to make Lower Low).

Your Predictive Rules:

If a Lower High is made, a Lower Low is most likely next.

If a Higher High is made, a Higher Low is most likely next.

If a Lower Low is made, a Lower High is most likely next.

If a Higher Low is made, a Higher High is most likely next.

CURRENT MARKET DATA:
Asset: ${symbol}
Current Price: ${currentPrice}
Signal Type: ${signal}
Recent Swing Points: ${JSON.stringify(swingPoints)}

YOUR ASSIGNMENT:
Calculate the exact Entry, Stop Loss (SL), and Take Profit (TP) for this setup.

MANDATORY RISK MANAGEMENT (1:4 R/R):
You MUST enforce a strict 1:4 Risk/Reward ratio.

If BUY: Place the SL safely below the recent Higher Low. Calculate TP so that (TP - Entry) is exactly 4 times greater than (Entry - SL).

If SELL: Place the SL safely above the recent Lower High. Calculate TP so that (Entry - TP) is exactly 4 times greater than (SL - Entry).

Return ONLY a raw JSON object with no markdown formatting or backticks. Format: { "entry": number, "sl": number, "tp": number }`;
}

// ─── Fallback setup when parsing fails ───────────────────────────────────────

function buildFallback(signal: "BUY" | "SELL", currentPrice: number): TradeSetup {
    return signal === "BUY"
        ? { entry: currentPrice, sl: currentPrice * 0.99, tp: currentPrice * 1.02 }
        : { entry: currentPrice, sl: currentPrice * 1.01, tp: currentPrice * 0.98 };
}

// ─── Route Handler ────────────────────────────────────────────────────────────

export async function POST(req: NextRequest): Promise<NextResponse> {
    try {
        // 1 ── Validate request body
        let body: AnalyzeRequestBody;
        try {
            body = (await req.json()) as AnalyzeRequestBody;
        } catch {
            return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
        }

        const { signal, currentPrice, symbol, swingPoints } = body;

        if (!signal || !currentPrice || !symbol || !Array.isArray(swingPoints)) {
            return NextResponse.json(
                { error: "Missing required fields: signal, currentPrice, symbol, swingPoints" },
                { status: 400 }
            );
        }

        if (signal !== "BUY" && signal !== "SELL") {
            return NextResponse.json(
                { error: "signal must be 'BUY' or 'SELL'" },
                { status: 400 }
            );
        }

        // 2 ── Verify API key
        const apiKey = process.env.GEMINI_API_KEY;
        if (!apiKey || apiKey === "your_gemini_api_key_here") {
            console.error("AI Route Error: GEMINI_API_KEY is missing or still set to placeholder");
            return NextResponse.json(
                { error: "GEMINI_API_KEY is not configured on the server" },
                { status: 500 }
            );
        }

        // 3 ── Call Gemini
        const ai = new GoogleGenAI({ apiKey });
        const prompt = buildPrompt(signal, symbol, currentPrice, swingPoints);


        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents: prompt,
            config: {
                responseMimeType: "application/json",
                temperature: 0.2,
                // No maxOutputTokens cap — prevents truncated / cut-off JSON
            },
        });

        const rawText = response.text ?? "";

        // 4 ── Robust parse with cleanup + fallback
        let setup: TradeSetup;
        let usedFallback = false;

        try {
            // Strip any accidental markdown fences the model may still emit
            const cleanText = rawText
                .replace(/```json/g, "")
                .replace(/```/g, "")
                .trim();


            setup = JSON.parse(cleanText) as TradeSetup;

            if (
                typeof setup.entry !== "number" ||
                typeof setup.sl !== "number" ||
                typeof setup.tp !== "number"
            ) {
                throw new Error(`Unexpected shape: ${JSON.stringify(setup)}`);
            }
        } catch (parseErr: unknown) {
            const msg = parseErr instanceof Error ? parseErr.message : String(parseErr);
            console.error("AI Route Error: JSON parse failed —", msg, "| raw:", rawText);

            // Fallback: derive sensible levels from current price so the UI still renders
            setup = buildFallback(signal, currentPrice);
            usedFallback = true;
            console.warn("[analyze] Using fallback setup:", setup);
        }

        // 5 ── Push Telegram notification (non-blocking — failure never affects the UI response)
        try {
            const botToken = process.env.TELEGRAM_BOT_TOKEN;
            const chatId = process.env.TELEGRAM_CHAT_ID;

            if (botToken && chatId) {
                const text =
                    `🚨 <b>TradePulse AI Alert</b> 🚨\n\n` +
                    `<b>Asset:</b> ${symbol}\n` +
                    `<b>Signal:</b> ${signal}\n\n` +
                    `<b>🎯 Entry:</b> ${setup.entry}\n` +
                    `<b>🛑 SL:</b> ${setup.sl}\n` +
                    `<b>✅ TP:</b> ${setup.tp}`;

                await fetch(
                    `https://api.telegram.org/bot${botToken}/sendMessage`,
                    {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({
                            chat_id: chatId,
                            parse_mode: "HTML",
                            text,
                        }),
                    }
                );
            }
        } catch (telegramErr: unknown) {
            console.error("Telegram Error:", telegramErr);
        }

        // 6 ── Persist trade setup to the SQLite journal (non-blocking)
        try {
            await prisma.trade.create({
                data: {
                    symbol,
                    signal,
                    entry: setup.entry,
                    sl: setup.sl,
                    tp: setup.tp,
                },
            });
        } catch (dbErr: unknown) {
            console.error("DB Write Error:", dbErr);
        }

        return NextResponse.json(
            { signal, symbol, currentPrice, setup, ...(usedFallback && { fallback: true }) },
            { status: 200 }
        );

    } catch (error: unknown) {
        // Catch-all for unexpected SDK / network errors
        const message = error instanceof Error ? error.message : String(error);
        console.error("AI Route Error:", error);
        return NextResponse.json(
            { error: message || "Failed to analyze" },
            { status: 500 }
        );
    }
}
