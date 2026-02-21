"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { usePriceFeed } from "@/hooks/usePriceFeed";
import { LayoutDashboard, TrendingUp, Edit3, ChevronRight, Activity, Zap } from "lucide-react";

// ─── Assets config ────────────────────────────────────────────────────────────

const ASSETS = [
    { id: "BTC/USD", tvSymbol: "BINANCE:BTCUSDT", name: "Bitcoin", icon: "₿" },
    { id: "ETH/USD", tvSymbol: "BINANCE:ETHUSDT", name: "Ethereum", icon: "Ξ" },
    { id: "XAU/USD", tvSymbol: "OANDA:XAUUSD", name: "Gold", icon: "Au" },
];

export type AssetId = typeof ASSETS[number]["id"];

// ─── Zero-dependency TradingView Widget ───────────────────────────────────────

declare global {
    interface Window {
        TradingView: any;
    }
}

function TradingViewWidget({ symbol }: { symbol: string }) {
    const container = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (!container.current) return;

        // Clear previous widget
        container.current.innerHTML = "";

        const script = document.createElement("script");
        script.src = "https://s3.tradingview.com/tv.js";
        script.async = true;
        script.onload = () => {
            if (typeof window.TradingView !== "undefined") {
                new window.TradingView.widget({
                    autosize: true,
                    symbol: symbol,
                    interval: "240", // 4H chart for swing trading
                    timezone: "Africa/Nairobi",
                    theme: "dark",
                    style: "1",
                    locale: "en",
                    enable_publishing: false,
                    backgroundColor: "#0d1525", // Matches our bg
                    gridColor: "#1e2d45",
                    hide_top_toolbar: false,
                    hide_legend: false,
                    save_image: false,
                    container_id: container.current?.id,
                    toolbar_bg: "#0a0e1a",
                });
            }
        };
        container.current.appendChild(script);
    }, [symbol]);

    return (
        <div
            id={`tv_chart_${symbol.replace(/[^a-zA-Z0-9]/g, "")}`}
            ref={container}
            className="w-full h-full rounded-xl overflow-hidden border border-[#1e2d45]"
        />
    );
}

// ─── Live Tape Component ──────────────────────────────────────────────────────

function LiveTape({ assetId }: { assetId: AssetId }) {
    const { prices } = usePriceFeed();
    const currentPriceData = prices[assetId];
    const currentPrice = currentPriceData?.price;

    const [tape, setTape] = useState<Array<{ id: number; price: number; time: string; direction: "up" | "down" | "flat" }>>([]);
    const lastPriceRef = useRef<number | null>(null);
    const idCounter = useRef(0);

    useEffect(() => {
        if (!currentPrice || currentPrice === lastPriceRef.current) return;

        const direction: "up" | "down" | "flat" = lastPriceRef.current === null
            ? "flat"
            : currentPrice > lastPriceRef.current
                ? "up"
                : "down";

        const now = new Intl.DateTimeFormat("en-US", {
            hour: "2-digit",
            minute: "2-digit",
            second: "2-digit",
            hour12: false,
            timeZone: "Africa/Nairobi",
        }).format(new Date());

        const newPrint = {
            id: idCounter.current++,
            price: currentPrice,
            time: now,
            direction
        };

        setTape((prev) => [newPrint, ...prev].slice(0, 30)); // Keep last 30 prints
        lastPriceRef.current = currentPrice;
    }, [currentPrice]);

    return (
        <div className="flex-1 min-h-[250px] bg-[#0d1525] border border-[#1e2d45] rounded-xl flex flex-col overflow-hidden">
            <div className="flex items-center gap-2 px-4 py-3 border-b border-[#1e2d45] bg-[#111827]">
                <Activity size={14} className="text-cyan-400" />
                <h3 className="text-xs font-semibold uppercase tracking-wider text-[#94a3b8]">Live Tape</h3>
                <div className="ml-auto flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 live-dot"></span>
                </div>
            </div>

            <div className="flex-1 overflow-y-auto p-2 scrollbar-thin scrollbar-thumb-[#1e2d45] scrollbar-track-transparent">
                {tape.length === 0 ? (
                    <div className="h-full flex items-center justify-center text-xs text-[#475569]">
                        Waiting for prints...
                    </div>
                ) : (
                    <div className="flex flex-col gap-1">
                        {tape.map((print) => (
                            <div key={print.id} className="flex items-center justify-between px-2 py-1.5 rounded hover:bg-[#1a2235] transition-colors text-xs tabular-nums font-mono">
                                <span className="text-[#64748b]">{print.time}</span>
                                <span className={
                                    print.direction === "up" ? "text-emerald-400 font-medium" :
                                        print.direction === "down" ? "text-rose-400 font-medium" :
                                            "text-[#94a3b8]"
                                }>
                                    {print.direction === "up" ? "▲" : print.direction === "down" ? "▼" : "−"}{" "}
                                    {print.price.toLocaleString("en-US", { minimumFractionDigits: 2 })}
                                </span>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function MarketsPage() {
    const [activeAsset, setActiveAsset] = useState<AssetId>("BTC/USD");
    const [notes, setNotes] = useState("");

    const activeConfig = ASSETS.find(a => a.id === activeAsset)!;

    // Load notes from local storage on mount
    useEffect(() => {
        const saved = localStorage.getItem(`tradepulse_notes_${activeAsset}`);
        if (saved) setNotes(saved);
        else setNotes(""); // Reset if nothing saved for this asset
    }, [activeAsset]);

    // Save notes to local storage automatically
    const handleNotesChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        const val = e.target.value;
        setNotes(val);
        localStorage.setItem(`tradepulse_notes_${activeAsset}`, val);
    };

    return (
        <div className="min-h-screen bg-[#0a0f1e] text-white flex flex-col overflow-hidden">

            {/* ── Top Nav ────────────────────────────────────────────────── */}
            <nav className="shrink-0 z-20 flex items-center gap-3 px-6 py-3 bg-[#0a0f1e]/80 backdrop-blur-md border-b border-[#1e2d45]">
                <Link
                    href="/"
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm text-[#94a3b8] hover:text-white hover:bg-[#1a2235] transition-all duration-150"
                >
                    <LayoutDashboard size={14} /> Dashboard
                </Link>
                <ChevronRight size={14} className="text-[#334155]" />
                <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium text-cyan-300 bg-cyan-500/10 border border-cyan-500/20">
                    <TrendingUp size={14} /> Markets
                </span>
            </nav>

            {/* ── Workspace ──────────────────────────────────────────────── */}
            <div className="flex-1 flex flex-col lg:flex-row overflow-y-auto lg:overflow-hidden">

                {/* Left Sidebar: Quick Toggle */}
                <div className="w-full lg:w-[200px] shrink-0 border-b lg:border-b-0 lg:border-r border-[#1e2d45] bg-[#0f1629] p-3 flex flex-row lg:flex-col gap-3 lg:gap-2 overflow-x-auto scrollbar-none items-center lg:items-stretch">
                    <h2 className="hidden lg:block text-[10px] font-bold uppercase tracking-widest text-[#475569] mb-2 px-1">Watchlist</h2>

                    {ASSETS.map((asset) => (
                        <button
                            key={asset.id}
                            onClick={() => setActiveAsset(asset.id)}
                            className={`flex shrink-0 min-w-[150px] lg:min-w-0 items-center gap-3 lg:w-full px-3 py-2 lg:py-3 rounded-xl transition-all duration-200 text-left ${activeAsset === asset.id
                                ? "bg-cyan-500/20 text-cyan-400 border border-cyan-500/30 lg:shadow-[0_0_15px_rgba(34,211,238,0.1)]"
                                : "bg-[#111827] text-[#94a3b8] border border-[#1e2d45] hover:border-[#334155] hover:bg-[#1a2235]"
                                }`}
                        >
                            <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${activeAsset === asset.id ? "bg-cyan-500/20 text-cyan-400" : "bg-[#1e2d45] text-[#94a3b8]"
                                }`}>
                                <span className="text-sm font-bold">{asset.icon}</span>
                            </div>
                            <div>
                                <div className="text-sm font-bold">{asset.id}</div>
                                <div className="text-[10px] text-[#475569] truncate w-[80px]">{asset.name}</div>
                            </div>
                        </button>
                    ))}

                    <div className="hidden lg:block mt-auto px-1">
                        <div className="p-3 rounded-lg bg-[#111827] border border-[#1e2d45]">
                            <p className="text-[10px] text-[#64748b] leading-tight">
                                <strong className="text-white">Pro Tip:</strong> Use the 4H timeframe for ICC swing setups. Wait for the 1:4 R/R confirmation before entry.
                            </p>
                        </div>
                    </div>
                </div>

                {/* Center: Chart */}
                <div className="flex-1 p-4 flex flex-col min-h-[400px] lg:min-h-0">
                    {/* Header above chart */}
                    <div className="flex items-center gap-3 mb-4 shrink-0">
                        <div className="w-8 h-8 rounded-lg bg-[#111827] border border-[#1e2d45] flex items-center justify-center">
                            <TrendingUp size={14} className="text-white" />
                        </div>
                        <div>
                            <h1 className="text-lg font-bold text-white tracking-tight">{activeConfig.id}</h1>
                            <p className="text-[11px] text-[#64748b]">{activeConfig.tvSymbol} • Advanced Chart</p>
                        </div>
                    </div>

                    {/* TV Widget Wrapper */}
                    <div className="flex-1 bg-[#0d1525] rounded-xl relative shadow-xl min-h-[300px] lg:min-h-0">
                        {/* We use key to force unmount/remount of the widget when symbol changes */}
                        <TradingViewWidget key={activeConfig.tvSymbol} symbol={activeConfig.tvSymbol} />
                    </div>
                </div>

                {/* Right Sidebar: Tools */}
                <div className="w-full lg:w-[320px] shrink-0 border-l border-[#1e2d45] bg-[#0a0f1e] p-4 flex flex-col gap-4 overflow-y-auto">

                    {/* ICC Notes */}
                    <div className="flex flex-col bg-[#0d1525] border border-[#1e2d45] rounded-xl overflow-hidden shrink-0">
                        <div className="flex items-center gap-2 px-4 py-3 border-b border-[#1e2d45] bg-[#111827]">
                            <Edit3 size={14} className="text-amber-400" />
                            <h3 className="text-xs font-semibold uppercase tracking-wider text-[#94a3b8]">ICC Structure Notes</h3>
                        </div>
                        <div className="p-3">
                            <textarea
                                value={notes}
                                onChange={handleNotesChange}
                                placeholder={`e.g. ${activeAsset}: H4 Indication HH confirmed at 69K, waiting for correction HL...`}
                                className="w-full h-32 bg-[#0a0e1a] border border-[#1e2d45] rounded-lg p-3 text-sm text-white placeholder:text-[#334155] focus:outline-none focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/50 resize-none transition-all"
                            />
                        </div>
                        <div className="px-4 py-2 bg-[#0a0e1a] border-t border-[#1e2d45] text-[10px] text-[#475569] flex justify-between">
                            <span>Auto-saved to browser</span>
                            <span>{activeAsset}</span>
                        </div>
                    </div>

                    {/* Live Tape */}
                    <LiveTape assetId={activeAsset} />

                </div>
            </div>
        </div>
    );
}
