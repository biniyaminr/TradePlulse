"use client";

import { useEffect, useRef, useState } from "react";
import { useWebSocket } from "./useWebSocket";

export interface PriceData {
    symbol: string;
    price: number;
    change: number;
    changePercent: number;
    high24h: number;
    low24h: number;
    volume: number;
    history: number[]; // last 20 prices for sparkline
}

type PriceMap = Record<string, PriceData>;

// ─── Seed / fallback data ────────────────────────────────────────────────────
const SEED: PriceMap = {
    "BTC/USD": {
        symbol: "BTC/USD",
        price: 68_420.5,
        change: 1540.25,
        changePercent: 2.3,
        high24h: 69_100.0,
        low24h: 66_200.0,
        volume: 28_430_000_000,
        history: Array.from({ length: 20 }, (_, i) => 66_000 + i * 120 + Math.random() * 300),
    },
    "XAU/USD": {
        symbol: "XAU/USD",
        price: 2_351.75,
        change: -12.3,
        changePercent: -0.52,
        high24h: 2_375.0,
        low24h: 2_330.0,
        volume: 98_700_000,
        history: Array.from({ length: 20 }, (_, i) => 2_320 + i * 2 + Math.random() * 10),
    },
    "ETH/USD": {
        symbol: "ETH/USD",
        price: 3_512.8,
        change: 88.4,
        changePercent: 2.58,
        high24h: 3_550.0,
        low24h: 3_400.0,
        volume: 12_100_000_000,
        history: Array.from({ length: 20 }, (_, i) => 3_400 + i * 8 + Math.random() * 20),
    },
    "EUR/USD": {
        symbol: "EUR/USD",
        price: 1.0854,
        change: 0.0032,
        changePercent: 0.3,
        high24h: 1.088,
        low24h: 1.082,
        volume: 85_000_000_000,
        history: Array.from({ length: 20 }, (_, i) => 1.082 + i * 0.0002 + Math.random() * 0.0005),
    },
    "GBP/USD": {
        symbol: "GBP/USD",
        price: 1.2675,
        change: -0.0041,
        changePercent: -0.32,
        high24h: 1.273,
        low24h: 1.264,
        volume: 62_000_000_000,
        history: Array.from({ length: 20 }, (_, i) => 1.264 + i * 0.0002 + Math.random() * 0.0005),
    },
    "SOL/USD": {
        symbol: "SOL/USD",
        price: 174.5,
        change: 6.8,
        changePercent: 4.05,
        high24h: 178.0,
        low24h: 163.0,
        volume: 3_200_000_000,
        history: Array.from({ length: 20 }, (_, i) => 163 + i * 0.8 + Math.random() * 2),
    },
};

// ─── Random-walk for dummy mode ───────────────────────────────────────────────
function randomWalk(data: PriceData): PriceData {
    const isForex = data.price < 10;
    const volatility = isForex ? 0.0003 : data.price * 0.001;
    const delta = (Math.random() - 0.48) * volatility;
    const newPrice = Math.max(data.price + delta, 0.0001);
    const basePrice = data.price - data.change;
    const newChange = newPrice - basePrice;
    const newChangePercent = basePrice !== 0 ? (newChange / basePrice) * 100 : 0;
    return {
        ...data,
        price: newPrice,
        change: newChange,
        changePercent: newChangePercent,
        high24h: Math.max(data.high24h, newPrice),
        low24h: Math.min(data.low24h, newPrice),
        history: [...data.history.slice(1), newPrice],
    };
}

// ─── Twelve Data message shape ────────────────────────────────────────────────
interface TwelveDataPrice {
    event: "price" | "subscribe-status" | "heartbeat";
    symbol?: string;
    price?: number;
    currency_base?: string;
    currency_quote?: string;
}

const WS_URL = process.env.NEXT_PUBLIC_WS_URL ?? null;

// Symbols to subscribe to (must match Twelve Data format)
const SUBSCRIBE_SYMBOLS = "BTC/USD,XAU/USD";

// ─── Hook ─────────────────────────────────────────────────────────────────────
export function usePriceFeed(): { prices: PriceMap; isLive: boolean } {
    const [prices, setPrices] = useState<PriceMap>(SEED);
    const prevRef = useRef<PriceMap>(SEED);

    const { lastMessage, readyState, sendMessage } = useWebSocket(WS_URL);

    // Keep prevRef in sync for the dummy-walk interval
    useEffect(() => {
        prevRef.current = prices;
    }, [prices]);

    // ── Step 1: Subscribe as soon as the socket opens ──────────────────────────
    useEffect(() => {
        if (readyState !== 1) return; // 1 = OPEN
        sendMessage(
            JSON.stringify({
                action: "subscribe",
                params: { symbols: SUBSCRIBE_SYMBOLS },
            })
        );
    }, [readyState, sendMessage]);

    // ── Step 2: Handle incoming messages from Twelve Data ─────────────────────
    useEffect(() => {
        if (!lastMessage) return;
        try {
            const data = JSON.parse(lastMessage.data as string) as TwelveDataPrice;

            // Only act on real price events
            if (data.event !== "price" || !data.symbol || typeof data.price !== "number") return;

            const incomingSymbol = data.symbol; // e.g. "BTC/USD"
            const newPrice = data.price;

            setPrices((prev) => {
                const existing = prev[incomingSymbol] ?? SEED[incomingSymbol];
                if (!existing) return prev; // unknown symbol — ignore

                // Preserve the original open-price baseline from seed for change calculation
                const basePrice = existing.price - existing.change;
                const newChange = newPrice - basePrice;
                const newChangePercent = basePrice !== 0 ? (newChange / basePrice) * 100 : 0;

                const updated: PriceData = {
                    ...existing,
                    price: newPrice,
                    change: newChange,
                    changePercent: newChangePercent,
                    high24h: Math.max(existing.high24h, newPrice),
                    low24h: Math.min(existing.low24h, newPrice),
                    history: [...existing.history.slice(1), newPrice],
                };

                return { ...prev, [incomingSymbol]: updated };
            });
        } catch {
            // Silently ignore malformed frames
        }
    }, [lastMessage]);

    // ── Step 3: Dummy random-walk fallback (only when no WS URL is configured) ─
    useEffect(() => {
        if (WS_URL !== null) return; // real WebSocket takes over — skip dummy mode

        const interval = setInterval(() => {
            const updated: PriceMap = {};
            for (const [sym, data] of Object.entries(prevRef.current)) {
                updated[sym] = randomWalk(data);
            }
            prevRef.current = updated;
            setPrices({ ...updated });
        }, 1800);

        return () => clearInterval(interval);
    }, []);

    const isLive = WS_URL !== null && readyState === 1;

    return { prices, isLive };
}
