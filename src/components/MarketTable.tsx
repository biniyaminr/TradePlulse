"use client";

import { TrendingUp, TrendingDown, Minus } from "lucide-react";
import clsx from "clsx";
import type { PriceData } from "@/hooks/usePriceFeed";

interface MarketTableProps {
    prices: Record<string, PriceData>;
}

function formatPrice(symbol: string, price: number): string {
    if (price < 10) return price.toFixed(4);
    if (price > 1000) return price.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    return price.toFixed(2);
}

function formatVolume(vol: number): string {
    if (vol >= 1e12) return `$${(vol / 1e12).toFixed(2)}T`;
    if (vol >= 1e9) return `$${(vol / 1e9).toFixed(2)}B`;
    if (vol >= 1e6) return `$${(vol / 1e6).toFixed(2)}M`;
    return `$${vol.toLocaleString()}`;
}

const ASSET_DESCRIPTIONS: Record<string, string> = {
    "BTC/USD": "Bitcoin",
    "XAU/USD": "Gold",
    "ETH/USD": "Ethereum",
    "EUR/USD": "Euro",
    "GBP/USD": "British Pound",
    "SOL/USD": "Solana",
};

export default function MarketTable({ prices }: MarketTableProps) {
    const rows = Object.values(prices);

    return (
        <div className="rounded-xl border border-[#1e2d45] bg-[#111827] overflow-hidden">
            {/* Table header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-[#1e2d45]">
                <h2 className="text-sm font-semibold text-white">All Markets</h2>
                <span className="text-xs text-[#475569]">{rows.length} instruments</span>
            </div>

            <div className="overflow-x-auto">
                <table className="w-full text-sm min-w-[600px]">
                    <thead>
                        <tr className="border-b border-[#1e2d45]">
                            <th className="text-left px-5 py-3 text-[10px] font-semibold text-[#475569] uppercase tracking-widest">#</th>
                            <th className="text-left px-4 py-3 text-[10px] font-semibold text-[#475569] uppercase tracking-widest">Asset</th>
                            <th className="text-right px-4 py-3 text-[10px] font-semibold text-[#475569] uppercase tracking-widest">Price</th>
                            <th className="text-right px-4 py-3 text-[10px] font-semibold text-[#475569] uppercase tracking-widest">24h Change</th>
                            <th className="text-right px-4 py-3 text-[10px] font-semibold text-[#475569] uppercase tracking-widest hidden md:table-cell">24h High</th>
                            <th className="text-right px-4 py-3 text-[10px] font-semibold text-[#475569] uppercase tracking-widest hidden md:table-cell">24h Low</th>
                            <th className="text-right px-5 py-3 text-[10px] font-semibold text-[#475569] uppercase tracking-widest hidden lg:table-cell">Volume</th>
                        </tr>
                    </thead>
                    <tbody>
                        {rows.map((row, idx) => {
                            const isGain = row.change >= 0;
                            const isFlat = Math.abs(row.changePercent) < 0.01;
                            return (
                                <tr
                                    key={row.symbol}
                                    className="border-b border-[#1e2d45] last:border-0 hover:bg-[#1a2235] transition-colors cursor-pointer"
                                >
                                    <td className="px-5 py-3.5 text-[#475569] text-xs">{idx + 1}</td>
                                    <td className="px-4 py-3.5">
                                        <div className="flex items-center gap-3">
                                            <div className={clsx(
                                                "w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold",
                                                "bg-gradient-to-br",
                                                row.symbol.includes("BTC") ? "from-orange-500 to-yellow-500 text-white"
                                                    : row.symbol.includes("XAU") ? "from-yellow-500 to-yellow-300 text-black"
                                                        : row.symbol.includes("ETH") ? "from-purple-500 to-blue-500 text-white"
                                                            : row.symbol.includes("SOL") ? "from-purple-400 to-green-400 text-white"
                                                                : row.symbol.includes("EUR") ? "from-blue-500 to-blue-300 text-white"
                                                                    : "from-slate-500 to-slate-300 text-white"
                                            )}>
                                                {row.symbol.split("/")[0].slice(0, 1)}
                                            </div>
                                            <div>
                                                <p className="font-semibold text-white text-sm">{row.symbol}</p>
                                                <p className="text-xs text-[#475569]">{ASSET_DESCRIPTIONS[row.symbol] ?? ""}</p>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-4 py-3.5 text-right font-mono tabular-nums font-semibold text-white">
                                        {formatPrice(row.symbol, row.price)}
                                    </td>
                                    <td className="px-4 py-3.5 text-right">
                                        <span className={clsx(
                                            "inline-flex items-center justify-end gap-1 text-sm font-semibold",
                                            isFlat ? "text-[#94a3b8]" : isGain ? "text-emerald-400" : "text-red-400"
                                        )}>
                                            {isFlat ? <Minus size={11} /> : isGain ? <TrendingUp size={11} /> : <TrendingDown size={11} />}
                                            {isGain ? "+" : ""}{row.changePercent.toFixed(2)}%
                                        </span>
                                    </td>
                                    <td className="px-4 py-3.5 text-right hidden md:table-cell font-mono text-xs text-emerald-400 tabular-nums">
                                        {formatPrice(row.symbol, row.high24h)}
                                    </td>
                                    <td className="px-4 py-3.5 text-right hidden md:table-cell font-mono text-xs text-red-400 tabular-nums">
                                        {formatPrice(row.symbol, row.low24h)}
                                    </td>
                                    <td className="px-5 py-3.5 text-right hidden lg:table-cell text-xs text-[#475569] tabular-nums">
                                        {formatVolume(row.volume)}
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
