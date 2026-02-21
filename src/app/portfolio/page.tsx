export const dynamic = "force-dynamic";

import prisma from "@/lib/prisma";
import { BookOpen, TrendingUp, TrendingDown } from "lucide-react";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatPrice(price: number): string {
    if (price > 1000)
        return price.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    if (price < 10) return price.toFixed(4);
    return price.toFixed(2);
}

function formatDate(date: Date): string {
    return new Intl.DateTimeFormat("en-US", {
        month: "short",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
        hour12: false,
        timeZone: "Africa/Nairobi",
    }).format(date) + " EAT";
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default async function PortfolioPage() {
    const trades = await prisma.trade.findMany({ orderBy: { createdAt: "desc" } });

    return (
        <div className="min-h-screen bg-[#0a0f1e] text-white p-6 md:p-10">
            {/* Header */}
            <div className="mb-8 flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-[#1a2235] flex items-center justify-center">
                    <BookOpen size={18} className="text-blue-400" />
                </div>
                <div>
                    <h1 className="text-xl font-bold text-white">Trade Journal</h1>
                    <p className="text-xs text-[#475569]">AI-generated setups logged automatically</p>
                </div>
                <span className="ml-auto text-xs text-[#475569] bg-[#111827] border border-[#1e2d45] px-3 py-1.5 rounded-full">
                    {trades.length} {trades.length === 1 ? "trade" : "trades"} logged
                </span>
            </div>

            {trades.length === 0 ? (
                /* ── Empty state ─────────────────────────────────────────────── */
                <div className="flex flex-col items-center justify-center py-32 gap-4">
                    <div className="w-16 h-16 rounded-2xl bg-[#111827] border border-[#1e2d45] flex items-center justify-center">
                        <BookOpen size={28} className="text-[#334155]" />
                    </div>
                    <p className="text-[#475569] text-sm font-medium">Waiting for AI market detection…</p>
                    <p className="text-[#334155] text-xs max-w-xs text-center">
                        Trades will appear here automatically when the ICC strategy triggers a BUY or SELL signal.
                    </p>
                </div>
            ) : (
                /* ── Trade table ────────────────────────────────────────────── */
                <div className="rounded-xl border border-[#1e2d45] overflow-hidden">
                    <table className="w-full text-sm">
                        <thead>
                            <tr className="bg-[#111827] border-b border-[#1e2d45]">
                                {["Date", "Asset", "Signal", "Entry", "Stop Loss", "Take Profit", "R/R"].map((col) => (
                                    <th
                                        key={col}
                                        className="px-4 py-3 text-left text-[10px] font-semibold uppercase tracking-widest text-[#475569]"
                                    >
                                        {col}
                                    </th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {trades.map((trade: { id: string; symbol: string; signal: string; entry: number; sl: number; tp: number; createdAt: Date }, i: number) => {
                                const isBuy = trade.signal === "BUY";
                                const rr = Math.abs(trade.tp - trade.entry) / Math.abs(trade.entry - trade.sl);

                                return (
                                    <tr
                                        key={trade.id}
                                        className={`border-b border-[#1e2d45] transition-colors hover:bg-[#111827]/60
                      ${i % 2 === 0 ? "bg-[#0a0f1e]" : "bg-[#0d1525]"}`}
                                    >
                                        {/* Date */}
                                        <td className="px-4 py-3 text-xs text-[#64748b] whitespace-nowrap tabular-nums">
                                            {formatDate(trade.createdAt)}
                                        </td>

                                        {/* Asset */}
                                        <td className="px-4 py-3 font-semibold text-white">
                                            {trade.symbol}
                                        </td>

                                        {/* Signal */}
                                        <td className="px-4 py-3">
                                            <span
                                                className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full
                          text-[11px] font-bold uppercase tracking-widest border
                          ${isBuy
                                                        ? "bg-emerald-500/10 text-emerald-300 border-emerald-500/30"
                                                        : "bg-rose-500/10 text-rose-300 border-rose-500/30"
                                                    }`}
                                            >
                                                {isBuy ? <TrendingUp size={10} /> : <TrendingDown size={10} />}
                                                {trade.signal}
                                            </span>
                                        </td>

                                        {/* Entry */}
                                        <td className="px-4 py-3 tabular-nums text-white font-medium">
                                            {formatPrice(trade.entry)}
                                        </td>

                                        {/* Stop Loss */}
                                        <td className="px-4 py-3 tabular-nums text-rose-400 font-medium">
                                            {formatPrice(trade.sl)}
                                        </td>

                                        {/* Take Profit */}
                                        <td className="px-4 py-3 tabular-nums text-emerald-400 font-medium">
                                            {formatPrice(trade.tp)}
                                        </td>

                                        {/* Risk/Reward */}
                                        <td className="px-4 py-3">
                                            <span
                                                className={`text-xs font-semibold tabular-nums
                          ${rr >= 2 ? "text-emerald-400" : rr >= 1 ? "text-amber-400" : "text-rose-400"}`}
                                            >
                                                {rr.toFixed(2)}R
                                            </span>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
}
