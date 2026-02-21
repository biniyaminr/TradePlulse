"use client";

import { useEffect, useState } from "react";
import { Wifi, WifiOff, Bell } from "lucide-react";
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
        <header className="flex items-center justify-between px-4 md:px-6 py-3 md:py-4 border-b border-[#1e2d45] bg-[#0f1629] shrink-0 z-10">
            {/* Left: status + title */}
            <div className="flex items-center gap-2 md:gap-4">
                <div className="hidden sm:block">
                    <h1 className="text-lg font-semibold text-white leading-tight">Live Markets</h1>
                    <p className="text-xs text-[#475569]">Real-time prices updated continuously</p>
                </div>
                <span
                    className={clsx(
                        "flex shrink-0 items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] md:text-xs font-semibold border",
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
