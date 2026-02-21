"use client";

import { useEffect, useState } from "react";
import { Wifi, WifiOff, Bell, Search } from "lucide-react";
import clsx from "clsx";

interface HeaderProps {
    isLive: boolean;
}

export default function Header({ isLive }: HeaderProps) {
    const [time, setTime] = useState("");

    useEffect(() => {
        const update = () => {
            setTime(
                new Date().toLocaleTimeString("en-US", {
                    hour: "2-digit",
                    minute: "2-digit",
                    second: "2-digit",
                    hour12: false,
                    timeZone: "UTC",
                }) + " UTC"
            );
        };
        update();
        const timer = setInterval(update, 1000);
        return () => clearInterval(timer);
    }, []);

    return (
        <header className="flex items-center justify-between px-6 py-4 border-b border-[#1e2d45] bg-[#0f1629] shrink-0">
            {/* Left: status + title */}
            <div className="flex items-center gap-4">
                <div>
                    <h1 className="text-lg font-semibold text-white leading-tight">Live Markets</h1>
                    <p className="text-xs text-[#475569]">Real-time prices updated continuously</p>
                </div>
                <span
                    className={clsx(
                        "flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border",
                        isLive
                            ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/30"
                            : "bg-amber-500/10 text-amber-400 border-amber-500/30"
                    )}
                >
                    {isLive ? (
                        <>
                            <Wifi size={11} />
                            LIVE
                        </>
                    ) : (
                        <>
                            <WifiOff size={11} />
                            DEMO
                        </>
                    )}
                </span>
            </div>

            {/* Right: search + clock + bell */}
            <div className="flex items-center gap-4">
                {/* Search */}
                <div className="hidden md:flex items-center gap-2 px-3 py-2 bg-[#111827] border border-[#1e2d45] rounded-lg text-sm text-[#475569]">
                    <Search size={14} />
                    <span>Search markets...</span>
                    <kbd className="ml-4 px-1.5 py-0.5 text-[10px] bg-[#1e2d45] rounded font-mono">⌘K</kbd>
                </div>

                {/* Clock */}
                <div className="hidden sm:flex items-center gap-1.5 text-sm font-mono text-[#94a3b8]">
                    <div className={clsx("w-1.5 h-1.5 rounded-full", isLive ? "bg-emerald-400 live-dot" : "bg-amber-400 live-dot")} />
                    {time}
                </div>

                {/* Bell */}
                <button className="relative flex items-center justify-center w-9 h-9 rounded-lg bg-[#111827] border border-[#1e2d45] text-[#94a3b8] hover:text-white hover:border-blue-500/30 transition-colors">
                    <Bell size={16} />
                    <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-blue-500" />
                </button>

                {/* Avatar */}
                <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-blue-500 to-cyan-400 flex items-center justify-center text-white text-sm font-bold cursor-pointer">
                    T
                </div>
            </div>
        </header>
    );
}
