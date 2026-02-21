"use client";

import { useEffect } from "react";
import { usePriceFeed } from "@/hooks/usePriceFeed";
import Sidebar from "./Sidebar";
import Header from "./Header";
import Ticker from "./Ticker";
import PriceCard from "./PriceCard";
import MarketTable from "./MarketTable";
import { BarChart2, Cpu } from "lucide-react";

export default function Dashboard() {
    const { prices, isLive } = usePriceFeed();

    // Request OS notification permission once on mount
    useEffect(() => {
        if (
            typeof window !== "undefined" &&
            "Notification" in window &&
            Notification.permission !== "granted" &&
            Notification.permission !== "denied"
        ) {
            Notification.requestPermission().catch(() => { /* silently ignored */ });
        }
    }, []);

    const btc = prices["BTC/USD"];
    const xau = prices["XAU/USD"];
    const eth = prices["ETH/USD"];
    const sol = prices["SOL/USD"];

    return (
        <div className="flex h-screen overflow-hidden bg-[#0a0e1a]">
            {/* Sidebar */}
            <Sidebar />

            {/* Main column */}
            <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
                {/* Header */}
                <Header isLive={isLive} />

                {/* Ticker strip */}
                <Ticker prices={prices} />

                {/* Scrollable content */}
                <main className="flex-1 overflow-y-auto p-6 space-y-6">
                    {/* Section: Featured feature tickers */}
                    <section>
                        <div className="flex items-center gap-2 mb-4">
                            <Cpu size={15} className="text-blue-400" />
                            <h2 className="text-sm font-semibold text-white">Featured Instruments</h2>
                            <span className="ml-auto text-xs text-[#475569]">Updates every ~2s</span>
                        </div>

                        {/* BTC and XAU — large featured cards */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                            {btc && <PriceCard data={btc} featured />}
                            {xau && <PriceCard data={xau} featured />}
                        </div>

                        {/* ETH and SOL — smaller secondary cards */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            {eth && <PriceCard data={eth} />}
                            {sol && <PriceCard data={sol} />}
                        </div>
                    </section>

                    {/* Section: Full market table */}
                    <section>
                        <div className="flex items-center gap-2 mb-4">
                            <BarChart2 size={15} className="text-blue-400" />
                            <h2 className="text-sm font-semibold text-white">All Markets</h2>
                        </div>
                        <MarketTable prices={prices} />
                    </section>

                    {/* Footer */}
                    <footer className="text-center text-xs text-[#2d3748] py-4">
                        TradePulse · Market data is for demonstration purposes only · Not financial advice
                    </footer>
                </main>
            </div>
        </div>
    );
}
