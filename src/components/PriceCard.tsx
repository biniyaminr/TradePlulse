"use client";

import { useEffect, useRef, useState } from "react";
import { TrendingUp, TrendingDown, Activity, Sparkles, AlertTriangle } from "lucide-react";
import { ResponsiveContainer, AreaChart, Area } from "recharts";
import clsx from "clsx";
import type { PriceData } from "@/hooks/usePriceFeed";
import { useICCStrategy } from "@/hooks/useICCStrategy";

// ─── Types ────────────────────────────────────────────────────────────────────

interface PriceCardProps {
    data: PriceData;
    featured?: boolean;
}

interface AISetup {
    entry: number;
    sl: number;
    tp: number;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatPrice(symbol: string, price: number): string {
    if (price < 10) return price.toFixed(4);
    if (price > 1000)
        return price.toLocaleString("en-US", {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
        });
    return price.toFixed(2);
}

function formatVolume(vol: number): string {
    if (vol >= 1e12) return `$${(vol / 1e12).toFixed(2)}T`;
    if (vol >= 1e9) return `$${(vol / 1e9).toFixed(2)}B`;
    if (vol >= 1e6) return `$${(vol / 1e6).toFixed(2)}M`;
    return `$${vol.toLocaleString()}`;
}

const ASSET_NAMES: Record<string, string> = {
    BTC: "Bitcoin",
    XAU: "Gold",
    ETH: "Ethereum",
    SOL: "Solana",
    EUR: "Euro",
    GBP: "British Pound",
};

// ─── Component ────────────────────────────────────────────────────────────────

export default function PriceCard({ data, featured = false }: PriceCardProps) {
    const isGain = data.change >= 0;
    const [flashClass, setFlashClass] = useState("");
    const prevPriceRef = useRef(data.price);

    // ICC strategy hook
    const icc = useICCStrategy(data);
    const hasSignal = icc.signal !== "NEUTRAL";

    // AI analysis state
    const [aiSetup, setAiSetup] = useState<AISetup | null>(null);
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [aiError, setAiError] = useState<string | null>(null);

    // Track the last signal we sent to avoid duplicate requests
    const lastSignalRef = useRef<string>("NEUTRAL");

    // latestRef lets the auto-fire effect read the freshest values without
    // listing them as deps (avoids hook-count / dep-array-size React error).
    // Updating a ref synchronously during render is safe and adds zero hooks.
    const latestRef = useRef({ swingPoints: icc.swingPoints, price: data.price, symbol: data.symbol });
    latestRef.current = { swingPoints: icc.swingPoints, price: data.price, symbol: data.symbol };

    // ── Price flash animation ─────────────────────────────────────────────────
    useEffect(() => {
        if (data.price !== prevPriceRef.current) {
            setFlashClass(data.price > prevPriceRef.current ? "flash-gain" : "flash-loss");
            prevPriceRef.current = data.price;
            const t = setTimeout(() => setFlashClass(""), 650);
            return () => clearTimeout(t);
        }
    }, [data.price]);

    // ── Auto-fire AI analysis when a signal triggers ──────────────────────────
    useEffect(() => {
        if (icc.signal === "NEUTRAL" || icc.signal === lastSignalRef.current) return;
        lastSignalRef.current = icc.signal;

        const { swingPoints, price, symbol } = latestRef.current;
        if (swingPoints.length < 2) return;

        setIsAnalyzing(true);
        setAiSetup(null);
        setAiError(null);

        fetch("/api/analyze", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                signal: icc.signal,
                symbol,
                currentPrice: price,
                swingPoints,
            }),
        })
            .then(async (res) => {
                const json = await res.json();
                if (!res.ok) throw new Error(json.error ?? "API error");
                const parsed = json.setup as AISetup;
                setAiSetup(parsed);

                // Fire OS desktop notification
                try {
                    if (
                        typeof window !== "undefined" &&
                        "Notification" in window &&
                        Notification.permission === "granted"
                    ) {
                        console.log("Firing notification...");
                        new Notification("\uD83D\uDEA8 TradePulse AI Setup", {
                            body: `${icc.signal} ${symbol}\nEntry: ${parsed.entry} | TP: ${parsed.tp}`,
                        });
                    }
                } catch { /* notifications blocked or unsupported — silently ignored */ }
            })
            .catch((err: Error) => { setAiError(err.message ?? "Unknown error"); })
            .finally(() => { setIsAnalyzing(false); });
    }, [icc.signal]); // stable — values read via latestRef

    // Reset AI panel when signal drops back to neutral — but don't stomp an in-flight test
    useEffect(() => {
        if (icc.signal === "NEUTRAL" && !isAnalyzing) {
            lastSignalRef.current = "NEUTRAL";
            setAiSetup(null);
            setAiError(null);
        }
    }, [icc.signal, isAnalyzing]);


    const sparkData = data.history.map((v) => ({ v }));
    const strokeColor = isGain ? "#10b981" : "#ef4444";
    const fillId = `fill-${data.symbol.replace("/", "-")}`;
    const assetBase = data.symbol.split("/")[0];
    const isBuy = icc.signal === "BUY";
    const isSell = icc.signal === "SELL";

    return (
        <div
            className={clsx(
                "relative rounded-xl border overflow-hidden transition-all duration-200 group",
                "bg-[#111827] border-[#1e2d45] hover:border-blue-500/40",
                featured ? "p-6" : "p-4",
                flashClass
            )}
        >
            {/* Gradient accent top line */}
            <div
                className={clsx(
                    "absolute top-0 left-0 right-0 h-0.5",
                    isBuy
                        ? "bg-gradient-to-r from-emerald-400/0 via-emerald-400 to-emerald-400/0"
                        : isSell
                            ? "bg-gradient-to-r from-red-500/0 via-red-500 to-red-500/0"
                            : isGain
                                ? "bg-gradient-to-r from-emerald-500/0 via-emerald-500 to-emerald-500/0"
                                : "bg-gradient-to-r from-red-500/0 via-red-500 to-red-500/0"
                )}
            />

            {/* ── ICC Signal Badge (absolute top-right) ──────────────────────────── */}
            {hasSignal && (
                <div
                    className={clsx(
                        "absolute top-3 right-3 z-10",
                        "flex items-center gap-1 px-2 py-1 sm:px-2.5 sm:py-1 rounded-full",
                        "text-[9px] sm:text-[11px] font-bold tracking-widest uppercase border",
                        isBuy
                            ? "bg-emerald-500/15 text-emerald-300 border-emerald-500/40 shadow-[0_0_10px_2px_rgba(16,185,129,0.35)]"
                            : "bg-red-500/15 text-red-300 border-red-500/40 shadow-[0_0_10px_2px_rgba(239,68,68,0.35)]"
                    )}
                >
                    <span
                        className={clsx(
                            "w-1.5 h-1.5 rounded-full live-dot",
                            isBuy ? "bg-emerald-400" : "bg-red-400"
                        )}
                    />
                    {icc.signal}
                </div>
            )}

            {/* Header row */}
            <div className="flex items-start justify-between mb-3 gap-2">
                <div className="flex items-center gap-2">
                    <div
                        className={clsx(
                            "flex items-center justify-center rounded-lg",
                            featured ? "w-10 h-10" : "w-8 h-8",
                            "bg-[#1a2235] text-[#94a3b8]"
                        )}
                    >
                        <Activity size={featured ? 18 : 14} />
                    </div>
                    <div>
                        <p className={clsx("font-bold text-white", featured ? "text-base" : "text-sm")}>
                            {data.symbol}
                        </p>
                        <p className="text-xs text-[#475569]">{ASSET_NAMES[assetBase] ?? assetBase}</p>
                    </div>
                </div>

                {/* 24h change badge — shifts left when signal badge occupies top-right */}
                <span
                    className={clsx(
                        "flex items-center justify-center gap-1 px-2 py-1 rounded-md text-[10px] sm:text-xs font-semibold shrink-0",
                        hasSignal ? "mr-16 sm:mr-14" : "",
                        isGain ? "bg-emerald-500/10 text-emerald-400" : "bg-red-500/10 text-red-400"
                    )}
                >
                    {isGain ? <TrendingUp size={11} /> : <TrendingDown size={11} />}
                    {isGain ? "+" : ""}
                    {data.changePercent.toFixed(2)}%
                </span>
            </div>

            {/* Price */}
            <div className="mb-1">
                <p
                    className={clsx(
                        "font-bold tracking-tight text-white tabular-nums",
                        featured ? "text-2xl sm:text-3xl" : "text-lg sm:text-xl"
                    )}
                >
                    {formatPrice(data.symbol, data.price)}
                </p>
                <p className={clsx("text-sm mt-0.5", isGain ? "text-emerald-400" : "text-red-400")}>
                    {isGain ? "+" : ""}
                    {formatPrice(data.symbol, Math.abs(data.change))} today
                </p>
            </div>

            {/* ICC Pattern label */}
            {hasSignal && (
                <div
                    className={clsx(
                        "mt-2 mb-2 px-2.5 py-1.5 rounded-lg text-[11px] leading-snug border",
                        isBuy
                            ? "bg-emerald-500/5 border-emerald-500/20 text-emerald-400/80"
                            : "bg-red-500/5 border-red-500/20 text-red-400/80"
                    )}
                >
                    <span className="text-[#475569] font-medium">Pattern: </span>
                    {icc.patternLabel}
                    {icc.watchLevel !== null && (
                        <span className="ml-1 text-[#94a3b8]">
                            — level{" "}
                            <span className="font-semibold tabular-nums text-white/70">
                                {formatPrice(data.symbol, icc.watchLevel)}
                            </span>
                        </span>
                    )}
                </div>
            )}
            {!hasSignal && <div className="mb-2" />}

            {/* Sparkline */}
            <div className="h-14 -mx-1 mb-3">
                <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={sparkData} margin={{ top: 2, right: 0, left: 0, bottom: 2 }}>
                        <defs>
                            <linearGradient id={fillId} x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor={strokeColor} stopOpacity={0.25} />
                                <stop offset="95%" stopColor={strokeColor} stopOpacity={0} />
                            </linearGradient>
                        </defs>
                        <Area
                            type="monotone"
                            dataKey="v"
                            stroke={strokeColor}
                            strokeWidth={2}
                            fill={`url(#${fillId})`}
                            dot={false}
                            isAnimationActive={false}
                        />
                    </AreaChart>
                </ResponsiveContainer>
            </div>

            {/* ── AI Analysis Panel ─────────────────────────────────────────────── */}
            {hasSignal && (
                <div
                    className={clsx(
                        "mb-3 rounded-lg border overflow-hidden",
                        isBuy ? "border-emerald-500/20" : "border-red-500/20",
                        "bg-[#0d1525]"
                    )}
                >
                    {/* Panel header */}
                    <div
                        className={clsx(
                            "flex items-center gap-2 px-3 py-2 border-b",
                            isBuy ? "border-emerald-500/20" : "border-red-500/20"
                        )}
                    >
                        <Sparkles
                            size={11}
                            className={clsx(isBuy ? "text-emerald-400" : "text-red-400")}
                        />
                        <span className="text-[10px] font-semibold uppercase tracking-widest text-[#94a3b8]">
                            Gemini AI Analysis
                        </span>
                        {isAnalyzing && (
                            <span className="ml-auto flex items-center gap-1 text-[10px] text-[#475569]">
                                <span className="w-1.5 h-1.5 rounded-full bg-blue-400 live-dot" />
                                Analyzing…
                            </span>
                        )}
                    </div>

                    {/* Panel body */}
                    <div className="px-3 py-2.5">
                        {/* Loading skeleton */}
                        {isAnalyzing && !aiSetup && (
                            <div className="space-y-2 animate-pulse">
                                <div className="h-3 w-3/4 rounded bg-[#1e2d45]" />
                                <div className="h-3 w-1/2 rounded bg-[#1e2d45]" />
                                <div className="h-3 w-2/3 rounded bg-[#1e2d45]" />
                            </div>
                        )}

                        {/* Error state */}
                        {aiError && !isAnalyzing && (
                            <div className="flex items-start gap-2 text-[11px] text-amber-400/80">
                                <AlertTriangle size={12} className="mt-0.5 shrink-0" />
                                <span>{aiError}</span>
                            </div>
                        )}

                        {/* Results */}
                        {aiSetup && !isAnalyzing && (
                            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 sm:gap-3">
                                {/* Entry */}
                                <div>
                                    <p className="text-[9px] text-[#475569] uppercase tracking-widest mb-1">Entry</p>
                                    <p className="text-xs font-bold text-white tabular-nums">
                                        {formatPrice(data.symbol, aiSetup.entry)}
                                    </p>
                                </div>
                                {/* Stop Loss */}
                                <div>
                                    <p className="text-[9px] text-[#475569] uppercase tracking-widest mb-1">Stop Loss</p>
                                    <p className="text-xs font-bold text-red-400 tabular-nums">
                                        {formatPrice(data.symbol, aiSetup.sl)}
                                    </p>
                                    <p className="text-[9px] text-red-500/60 mt-0.5">
                                        {(Math.abs(aiSetup.entry - aiSetup.sl) / aiSetup.entry * 100).toFixed(2)}% risk
                                    </p>
                                </div>
                                {/* Take Profit */}
                                <div className="col-span-2 sm:col-span-1 mt-2 sm:mt-0 pt-2 sm:pt-0 border-t sm:border-0 border-[#1e2d45]">
                                    <p className="text-[9px] text-[#475569] uppercase tracking-widest mb-1">Take Profit</p>
                                    <p className="text-xs font-bold text-emerald-400 tabular-nums">
                                        {formatPrice(data.symbol, aiSetup.tp)}
                                    </p>
                                    <p className="text-[9px] text-emerald-500/60 mt-0.5">
                                        {(Math.abs(aiSetup.tp - aiSetup.entry) / Math.abs(aiSetup.entry - aiSetup.sl)).toFixed(1)}R reward
                                    </p>
                                </div>
                            </div>
                        )}

                        {/* Idle state — waiting for enough swing data */}
                        {!isAnalyzing && !aiSetup && !aiError && (
                            <p className="text-[11px] text-[#475569]">
                                Awaiting ICC pattern confirmation…
                            </p>
                        )}
                    </div>
                </div>
            )}

            {/* 24h stats */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 pt-3 border-t border-[#1e2d45]">
                <div>
                    <p className="text-[10px] text-[#475569] uppercase tracking-wide mb-0.5">24h High</p>
                    <p className="text-xs font-semibold text-emerald-400 tabular-nums">
                        {formatPrice(data.symbol, data.high24h)}
                    </p>
                </div>
                <div>
                    <p className="text-[10px] text-[#475569] uppercase tracking-wide mb-0.5">24h Low</p>
                    <p className="text-xs font-semibold text-red-400 tabular-nums">
                        {formatPrice(data.symbol, data.low24h)}
                    </p>
                </div>
                <div className="col-span-2 sm:col-span-1 mt-1 sm:mt-0 pt-1 sm:pt-0 border-t sm:border-0 border-[#1e2d45]">
                    <p className="text-[10px] text-[#475569] uppercase tracking-wide mb-0.5">Volume</p>
                    <p className="text-xs font-semibold text-[#94a3b8] tabular-nums">
                        {formatVolume(data.volume)}
                    </p>
                </div>
            </div>
        </div>
    );
}
