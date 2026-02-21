"use client";

import { TrendingUp, TrendingDown } from "lucide-react";
import clsx from "clsx";
import type { PriceData } from "@/hooks/usePriceFeed";

interface TickerProps {
    prices: Record<string, PriceData>;
}

function formatShort(symbol: string, price: number): string {
    if (price < 10) return price.toFixed(4);
    if (price > 1000) return price.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    return price.toFixed(2);
}

export default function Ticker({ prices }: TickerProps) {
    const items = Object.values(prices);

    return (
        <div className="w-full border-b border-[#1e2d45] bg-[#0f1629] overflow-hidden">
            <div className="flex items-center">
                {/* Frosted label */}
                <div className="shrink-0 px-4 py-2 border-r border-[#1e2d45] bg-[#111827] z-10">
                    <span className="text-[10px] font-bold text-[#475569] uppercase tracking-widest">Live</span>
                </div>

                {/* Scrolling content — doubled for seamless loop */}
                <div className="flex-1 overflow-hidden relative">
                    {/* Left fade */}
                    <div className="absolute left-0 top-0 bottom-0 w-8 z-10 bg-gradient-to-r from-[#0f1629] to-transparent" />
                    {/* Right fade */}
                    <div className="absolute right-0 top-0 bottom-0 w-8 z-10 bg-gradient-to-l from-[#0f1629] to-transparent" />

                    <div className="ticker-animate flex gap-0 whitespace-nowrap py-2">
                        {[...items, ...items].map((item, idx) => {
                            const isGain = item.change >= 0;
                            return (
                                <span
                                    key={`${item.symbol}-${idx}`}
                                    className="inline-flex items-center gap-2 px-5 border-r border-[#1e2d45]"
                                >
                                    <span className="text-xs font-semibold text-white">{item.symbol}</span>
                                    <span className={clsx("text-xs font-mono tabular-nums", isGain ? "text-emerald-400" : "text-red-400")}>
                                        {formatShort(item.symbol, item.price)}
                                    </span>
                                    <span className={clsx("flex items-center gap-0.5 text-[10px]", isGain ? "text-emerald-400" : "text-red-400")}>
                                        {isGain ? <TrendingUp size={9} /> : <TrendingDown size={9} />}
                                        {isGain ? "+" : ""}{item.changePercent.toFixed(2)}%
                                    </span>
                                </span>
                            );
                        })}
                    </div>
                </div>
            </div>
        </div>
    );
}
