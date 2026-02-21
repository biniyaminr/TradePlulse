export const dynamic = "force-dynamic";

import Link from "next/link";
import prisma from "@/lib/prisma";
import { BookOpen, TrendingUp, TrendingDown, LayoutDashboard, ChevronRight, RefreshCw, Activity, Wallet, Target, History, Edit2 } from "lucide-react";
import SimulatorEngine from "@/components/SimulatorEngine";
import AccountDashboard from "@/components/AccountDashboard";

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

    // Fallback account if simulation hasn't run yet
    let account = await prisma.account.findFirst();
    if (!account) {
        account = { id: "default", virtualBalance: 10000, riskPercentage: 1.0, winRate: 0, totalTrades: 0 };
    }

    const activeTrades = trades.filter(t => t.status === "ACTIVE");
    const closedTrades = trades.filter(t => t.status !== "ACTIVE");

    // Calculate total realized PnL from trades
    const totalPnl = closedTrades.reduce((sum, t) => sum + (t.pnl || 0), 0);

    return (
        <div className="min-h-screen bg-[#0a0f1e] text-white">
            <SimulatorEngine />

            {/* Top Navigation Bar */}
            <nav className="sticky top-0 z-20 flex items-center gap-3 px-6 py-3 bg-[#0a0f1e]/80 backdrop-blur-md border-b border-[#1e2d45]">
                <Link href="/" className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm text-[#94a3b8] hover:text-white hover:bg-[#1a2235] transition-all duration-150">
                    <LayoutDashboard size={14} /> Dashboard
                </Link>
                <ChevronRight size={14} className="text-[#334155]" />
                <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium text-blue-300 bg-blue-500/10 border border-blue-500/20">
                    <BookOpen size={14} /> Portfolio & Simulator
                </span>
                <div className="flex-1" />
                <Link href="/portfolio" className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs text-[#475569] hover:text-white hover:bg-[#1a2235] border border-[#1e2d45] hover:border-blue-500/30 transition-all duration-150">
                    <RefreshCw size={12} /> Refresh
                </Link>
            </nav>

            <div className="p-6 md:p-10 max-w-6xl mx-auto space-y-8">

                {/* ── Header ── */}
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-[#1a2235] flex items-center justify-center">
                        <Activity size={18} className="text-purple-400" />
                    </div>
                    <div>
                        <h1 className="text-xl font-bold text-white">Paper Trading Simulator</h1>
                        <p className="text-xs text-[#475569]">AI-generated setups executed in real-time simulation.</p>
                    </div>
                </div>

                {/* ── Account Overview Dashboard ── */}
                <AccountDashboard
                    virtualBalance={account.virtualBalance}
                    riskPercentage={account.riskPercentage ?? 1.0}
                    winRate={account.winRate}
                    totalTrades={account.totalTrades}
                    totalPnl={totalPnl}
                />

                {/* ── Active Trades ── */}
                <section>
                    <div className="flex items-center gap-2 mb-4">
                        <Activity size={16} className="text-blue-400" />
                        <h2 className="text-lg font-semibold">Active Orders ({activeTrades.length})</h2>
                    </div>

                    {activeTrades.length === 0 ? (
                        <div className="p-8 rounded-xl border border-[#1e2d45] bg-[#111827] text-center">
                            <p className="text-[#475569] text-sm">No active setups right now. Waiting for the AI...</p>
                        </div>
                    ) : (
                        <div className="rounded-xl border border-[#1e2d45] overflow-hidden">
                            <table className="w-full text-sm">
                                <thead>
                                    <tr className="bg-[#111827] border-b border-[#1e2d45]">
                                        {["Date", "Asset", "Signal", "Entry", "SL", "TP", "Size", "Risk"].map((col) => (
                                            <th key={col} className="px-4 py-3 text-left text-[10px] font-semibold uppercase tracking-widest text-[#475569]">
                                                {col}
                                            </th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody>
                                    {activeTrades.map((trade, i) => {
                                        const isBuy = trade.signal === "BUY";
                                        const rr = Math.abs(trade.tp - trade.entry) / Math.abs(trade.entry - trade.sl);

                                        return (
                                            <tr key={trade.id} className={`border-b border-[#1e2d45] ${i % 2 === 0 ? "bg-[#0a0f1e]" : "bg-[#0d1525]"}`}>
                                                <td className="px-4 py-3 text-xs text-[#64748b] whitespace-nowrap tabular-nums">{formatDate(trade.createdAt)}</td>
                                                <td className="px-4 py-3 font-semibold text-white">{trade.symbol}</td>
                                                <td className="px-4 py-3">
                                                    <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold uppercase tracking-widest border ${isBuy ? "bg-emerald-500/10 text-emerald-300 border-emerald-500/30" : "bg-rose-500/10 text-rose-300 border-rose-500/30"}`}>
                                                        {isBuy ? <TrendingUp size={10} /> : <TrendingDown size={10} />} {trade.signal}
                                                    </span>
                                                </td>
                                                <td className="px-4 py-3 tabular-nums font-medium text-white">{formatPrice(trade.entry)}</td>
                                                <td className="px-4 py-3 tabular-nums text-rose-400 font-medium">{formatPrice(trade.sl)}</td>
                                                <td className="px-4 py-3 tabular-nums text-emerald-400 font-medium">{formatPrice(trade.tp)}</td>
                                                <td className="px-4 py-3 tabular-nums text-blue-400 font-medium">{trade.positionSize ? trade.positionSize.toFixed(4) : "-"}</td>
                                                <td className="px-4 py-3 tabular-nums text-white font-semibold">${trade.riskAmount ? trade.riskAmount.toFixed(2) : "-"}</td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    )}
                </section>

                {/* ── Trade History ── */}
                <section>
                    <div className="flex items-center gap-2 mb-4 mt-8">
                        <History size={16} className="text-[#94a3b8]" />
                        <h2 className="text-lg font-semibold">Trade History ({closedTrades.length})</h2>
                    </div>

                    {closedTrades.length === 0 ? (
                        <div className="p-8 rounded-xl border border-[#1e2d45] bg-[#111827] text-center">
                            <p className="text-[#475569] text-sm">Simulation history is empty.</p>
                        </div>
                    ) : (
                        <div className="rounded-xl border border-[#1e2d45] overflow-hidden opacity-90 hover:opacity-100 transition-opacity">
                            <table className="w-full text-sm">
                                <thead>
                                    <tr className="bg-[#111827] border-b border-[#1e2d45]">
                                        {["Date", "Asset", "Status", "Entry", "Target Hit", "PnL"].map((col) => (
                                            <th key={col} className="px-4 py-3 text-left text-[10px] font-semibold uppercase tracking-widest text-[#475569]">
                                                {col}
                                            </th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody>
                                    {closedTrades.map((trade, i) => {
                                        const isWon = trade.status === "WON";
                                        const targetHit = isWon ? trade.tp : trade.sl;
                                        const pnlAmount = trade.pnl || 0;

                                        return (
                                            <tr key={trade.id} className={`border-b border-[#1e2d45] ${i % 2 === 0 ? "bg-[#0a0f1e]" : "bg-[#0d1525]"}`}>
                                                <td className="px-4 py-3 text-xs text-[#64748b] whitespace-nowrap tabular-nums">{formatDate(trade.createdAt)}</td>
                                                <td className="px-4 py-3 font-semibold text-[#94a3b8]">{trade.symbol}</td>
                                                <td className="px-4 py-3">
                                                    <span className={`inline-flex px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-widest border ${isWon ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" : "bg-rose-500/10 text-rose-400 border-rose-500/20"}`}>
                                                        {trade.status}
                                                    </span>
                                                </td>
                                                <td className="px-4 py-3 tabular-nums text-[#64748b]">{formatPrice(trade.entry)}</td>
                                                <td className="px-4 py-3 tabular-nums text-[#94a3b8] font-medium">{formatPrice(targetHit)}</td>
                                                <td className="px-4 py-3 tabular-nums font-bold">
                                                    <span className={isWon ? "text-emerald-400" : "text-rose-400"}>
                                                        {isWon ? "+" : "-"}${Math.abs(pnlAmount).toFixed(2)}
                                                    </span>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    )}
                </section>
            </div>
        </div>
    );
}
