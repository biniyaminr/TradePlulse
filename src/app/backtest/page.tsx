"use client";

import { useState } from "react";
import Link from "next/link";
import { LayoutDashboard, ChevronRight, Calculator, Play, Activity, TrendingUp, TrendingDown, Target, ShieldAlert } from "lucide-react";
import clsx from "clsx";

const ASSETS = ["BTC/USD", "ETH/USD", "XAU/USD"];
const TIMEFRAMES = ["1h", "4h", "1d"];

export default function BacktestPage() {
    const [asset, setAsset] = useState(ASSETS[0]);
    const [timeframe, setTimeframe] = useState(TIMEFRAMES[1]); // Default 4h
    const [isRunning, setIsRunning] = useState(false);
    const [results, setResults] = useState<any>(null);
    const [error, setError] = useState("");

    const runBacktest = async () => {
        setIsRunning(true);
        setError("");
        try {
            const res = await fetch("/api/backtest", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ asset, timeframe }),
            });
            const data = await res.json();

            if (!res.ok) {
                throw new Error(data.error || "Failed to run backtest");
            }

            setResults(data);
        } catch (err: any) {
            setError(err.message);
        } finally {
            setIsRunning(false);
        }
    };

    return (
        <div className="min-h-screen bg-[#0a0f1e] text-white">
            {/* ── Top Nav ────────────────────────────────────────────────── */}
            <nav className="sticky top-0 z-20 flex items-center gap-3 px-6 py-3 bg-[#0a0f1e]/80 backdrop-blur-md border-b border-[#1e2d45]">
                <Link
                    href="/"
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm text-[#94a3b8] hover:text-white hover:bg-[#1a2235] border border-transparent hover:border-[#1e2d45] transition-all duration-150"
                >
                    <LayoutDashboard size={14} /> Dashboard
                </Link>
                <ChevronRight size={14} className="text-[#334155]" />
                <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium text-indigo-300 bg-indigo-500/10 border border-indigo-500/20">
                    <Calculator size={14} /> Backtest Engine
                </span>
            </nav>

            <div className="p-4 md:p-8 max-w-6xl mx-auto space-y-6">

                {/* Header Section */}
                <div>
                    <h1 className="text-2xl font-bold bg-gradient-to-r from-white to-[#94a3b8] bg-clip-text text-transparent">
                        Quantitative Backtesting
                    </h1>
                    <p className="text-sm text-[#475569] mt-1">
                        Test the ICC Strategy (1:4 R/R) against historical market data.
                    </p>
                </div>

                {/* Control Panel */}
                <div className="bg-[#0d1525] border border-[#1e2d45] rounded-xl p-6 shadow-xl">
                    <h2 className="text-xs font-bold uppercase tracking-widest text-[#64748b] mb-4">Configuration</h2>

                    <div className="flex flex-col md:flex-row gap-4 items-end">
                        <div className="w-full md:w-64">
                            <label className="block text-xs font-semibold text-[#94a3b8] mb-2">Asset</label>
                            <select
                                value={asset}
                                onChange={(e) => setAsset(e.target.value)}
                                className="w-full bg-[#111827] border border-[#1e2d45] rounded-lg px-4 py-3 text-sm focus:outline-none focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/50 appearance-none text-white"
                            >
                                {ASSETS.map(a => <option key={a} value={a}>{a}</option>)}
                            </select>
                        </div>

                        <div className="w-full md:w-64">
                            <label className="block text-xs font-semibold text-[#94a3b8] mb-2">Timeframe</label>
                            <select
                                value={timeframe}
                                onChange={(e) => setTimeframe(e.target.value)}
                                className="w-full bg-[#111827] border border-[#1e2d45] rounded-lg px-4 py-3 text-sm focus:outline-none focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/50 appearance-none text-white"
                            >
                                {TIMEFRAMES.map(t => <option key={t} value={t}>{t === '1d' ? 'Daily' : t.toUpperCase()}</option>)}
                            </select>
                        </div>

                        <button
                            onClick={runBacktest}
                            disabled={isRunning}
                            className="w-full md:w-auto mt-4 md:mt-0 px-6 py-3 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-bold flex items-center justify-center gap-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed border border-indigo-400/20 shadow-[0_0_20px_rgba(79,70,229,0.2)]"
                        >
                            {isRunning ? (
                                <span className="flex items-center gap-2">
                                    <Activity size={16} className="animate-spin" /> Running...
                                </span>
                            ) : (
                                <>
                                    <Play size={16} fill="currentColor" /> Run Simulation
                                </>
                            )}
                        </button>
                    </div>

                    {error && (
                        <div className="mt-4 p-3 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-400 text-sm flex items-center gap-2">
                            <ShieldAlert size={16} /> {error}
                        </div>
                    )}
                </div>

                {/* Results Dashboard */}
                {results && (
                    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                        {/* Metrics Grid */}
                        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                            <div className="bg-[#0d1525] border border-[#1e2d45] rounded-xl p-5">
                                <div className="text-[#64748b] text-xs font-semibold uppercase tracking-wider mb-2">Total Net PnL</div>
                                <div className={clsx("text-2xl font-bold font-mono flex items-center gap-2", results.run.totalPnL >= 0 ? "text-emerald-400" : "text-rose-400")}>
                                    {results.run.totalPnL >= 0 ? <TrendingUp size={20} /> : <TrendingDown size={20} />}
                                    ${Math.abs(results.run.totalPnL).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                </div>
                            </div>

                            <div className="bg-[#0d1525] border border-[#1e2d45] rounded-xl p-5">
                                <div className="text-[#64748b] text-xs font-semibold uppercase tracking-wider mb-2">Win Rate</div>
                                <div className="text-2xl font-bold font-mono text-white flex items-center gap-2">
                                    <Target size={20} className="text-cyan-400" />
                                    {results.run.winRate.toFixed(2)}%
                                </div>
                            </div>

                            <div className="bg-[#0d1525] border border-[#1e2d45] rounded-xl p-5">
                                <div className="text-[#64748b] text-xs font-semibold uppercase tracking-wider mb-2">Profit Factor</div>
                                <div className="text-2xl font-bold font-mono text-white">
                                    {results.run.profitFactor.toFixed(2)}
                                </div>
                            </div>

                            <div className="bg-[#0d1525] border border-[#1e2d45] rounded-xl p-5">
                                <div className="text-[#64748b] text-xs font-semibold uppercase tracking-wider mb-2">Max Drawdown</div>
                                <div className="text-2xl font-bold font-mono text-rose-400 flex items-center gap-2">
                                    <TrendingDown size={20} />
                                    {results.run.maxDrawdown.toFixed(2)}%
                                </div>
                            </div>
                        </div>

                        {/* Trade History Table */}
                        <div className="bg-[#0d1525] border border-[#1e2d45] rounded-xl overflow-hidden shadow-xl">
                            <div className="px-6 py-4 border-b border-[#1e2d45] bg-[#111827] flex justify-between items-center">
                                <h3 className="font-semibold text-white">Simulated Trade Log</h3>
                                <span className="text-xs text-[#64748b] font-mono">{results.trades.length} trades found</span>
                            </div>

                            <div className="overflow-x-auto">
                                <table className="w-full text-left text-sm">
                                    <thead className="bg-[#0a0f1e] text-[#64748b] text-xs uppercase tracking-wider">
                                        <tr>
                                            <th className="px-6 py-3 font-semibold">Entry Date</th>
                                            <th className="px-6 py-3 font-semibold">Signal</th>
                                            <th className="px-6 py-3 font-semibold text-right">Entry Price</th>
                                            <th className="px-6 py-3 font-semibold text-right">Take Profit</th>
                                            <th className="px-6 py-3 font-semibold text-right">Stop Loss</th>
                                            <th className="px-6 py-3 font-semibold text-right">PnL</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-[#1e2d45]">
                                        {results.trades.length === 0 ? (
                                            <tr>
                                                <td colSpan={6} className="px-6 py-8 text-center text-[#64748b]">
                                                    No trades matched the criteria in this historical subset.
                                                </td>
                                            </tr>
                                        ) : (
                                            results.trades.map((trade: any, i: number) => (
                                                <tr key={i} className="hover:bg-[#111827]/50 transition-colors">
                                                    <td className="px-6 py-4 whitespace-nowrap text-[#94a3b8] font-mono text-xs">
                                                        {trade.entryDate}
                                                    </td>
                                                    <td className="px-6 py-4 whitespace-nowrap">
                                                        <span className={clsx(
                                                            "px-2 py-1 rounded text-[10px] font-bold uppercase tracking-wider",
                                                            trade.signal === "LONG" ? "bg-emerald-500/10 text-emerald-400" : "bg-rose-500/10 text-rose-400"
                                                        )}>
                                                            {trade.signal}
                                                        </span>
                                                    </td>
                                                    <td className="px-6 py-4 whitespace-nowrap text-right font-mono text-[#94a3b8]">
                                                        ${trade.entry.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                                    </td>
                                                    <td className="px-6 py-4 whitespace-nowrap text-right font-mono text-emerald-400">
                                                        ${trade.tp.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                                    </td>
                                                    <td className="px-6 py-4 whitespace-nowrap text-right font-mono text-rose-400">
                                                        ${trade.sl.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                                    </td>
                                                    <td className={clsx(
                                                        "px-6 py-4 whitespace-nowrap text-right font-mono font-bold",
                                                        trade.pnl > 0 ? "text-emerald-400" : "text-rose-400"
                                                    )}>
                                                        {trade.pnl > 0 ? "+" : "-"}${Math.abs(trade.pnl).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                                    </td>
                                                </tr>
                                            ))
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
