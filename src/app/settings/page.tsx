"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
    LayoutDashboard,
    Settings as SettingsIcon,
    ChevronRight,
    Target,
    Cpu,
    Activity,
    Palette,
    Save,
    Database,
    Send
} from "lucide-react";
import clsx from "clsx";

export default function SettingsPage() {
    // ─── State ──────────────────────────────────────────────────────────────

    // Trading Profile
    const [balance, setBalance] = useState("10000");
    const [riskPerTrade, setRiskPerTrade] = useState("2");

    // MetaApi Configuration
    const [metaApiToken, setMetaApiToken] = useState("");
    const [metaApiAccountId, setMetaApiAccountId] = useState("");

    // AI Strategy
    const [strictIcc, setStrictIcc] = useState(true);
    const [minRR, setMinRR] = useState("1:4");

    // Appearance
    const [tvTheme, setTvTheme] = useState("dark");

    // UI State
    const [saved, setSaved] = useState(false);
    const [dbConnected, setDbConnected] = useState(true); // Mock health check
    const [tgConnected, setTgConnected] = useState(true); // Mock health check

    // ─── Effects ────────────────────────────────────────────────────────────

    useEffect(() => {
        // Load localStorage settings
        const loaded = localStorage.getItem("tradepulse_settings");
        if (loaded) {
            try {
                const parsed = JSON.parse(loaded);
                if (parsed.strictIcc !== undefined) setStrictIcc(parsed.strictIcc);
                if (parsed.minRR) setMinRR(parsed.minRR);
                if (parsed.tvTheme) setTvTheme(parsed.tvTheme);
            } catch (e) {
                console.error("Failed to parse settings", e);
            }
        }

        // Fetch user account settings from DB
        const fetchAccount = async () => {
            try {
                const res = await fetch("/api/account");
                if (res.ok) {
                    const data = await res.json();
                    if (data.account) {
                        setBalance(data.account.virtualBalance?.toString() || "10000");
                        setRiskPerTrade(data.account.riskPercentage?.toString() || "2");
                        if (data.account.metaApiToken) setMetaApiToken(data.account.metaApiToken);
                        if (data.account.metaApiAccountId) setMetaApiAccountId(data.account.metaApiAccountId);
                    }
                }
            } catch (error) {
                console.error("Failed to fetch account", error);
            }
        };
        fetchAccount();

        // Simulating actual health checks here (could be real API calls in the future)
        setDbConnected(true);
        setTgConnected(true);
    }, []);

    const handleSave = async () => {
        const localSettings = { strictIcc, minRR, tvTheme };
        localStorage.setItem("tradepulse_settings", JSON.stringify(localSettings));

        try {
            await fetch("/api/account", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    newBalance: parseFloat(balance),
                    riskPercentage: parseFloat(riskPerTrade),
                    metaApiToken,
                    metaApiAccountId
                })
            });
        } catch (error) {
            console.error("Failed to save to db", error);
        }

        setSaved(true);
        setTimeout(() => setSaved(false), 2000);
    };

    // ─── Render ─────────────────────────────────────────────────────────────

    return (
        <div className="min-h-screen bg-[#0a0f1e] text-white flex flex-col">
            {/* Top Nav */}
            <nav className="shrink-0 z-20 flex items-center gap-3 px-6 py-3 bg-[#0a0f1e]/80 backdrop-blur-md border-b border-[#1e2d45]">
                <Link
                    href="/"
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm text-[#94a3b8] hover:text-white hover:bg-[#1a2235] transition-all duration-150"
                >
                    <LayoutDashboard size={14} /> Dashboard
                </Link>
                <ChevronRight size={14} className="text-[#334155]" />
                <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium text-blue-300 bg-blue-500/10 border border-blue-500/20">
                    <SettingsIcon size={14} /> Settings
                </span>
            </nav>

            <div className="flex-1 p-6 md:p-10 max-w-4xl w-full mx-auto overflow-y-auto scrollbar-none">
                <div className="flex items-center justify-between mb-8">
                    <div>
                        <h1 className="text-2xl font-bold tracking-tight">System Settings</h1>
                        <p className="text-sm text-[#64748b] mt-1">Configure TradePulse AI and risk parameters.</p>
                    </div>
                    <button
                        onClick={handleSave}
                        className={clsx(
                            "flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all shadow-lg",
                            saved
                                ? "bg-emerald-500 text-white shadow-emerald-500/20"
                                : "bg-blue-600 hover:bg-blue-500 text-white shadow-blue-500/20"
                        )}
                    >
                        <Save size={16} />
                        {saved ? "Saved" : "Save Changes"}
                    </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

                    {/* ── Trading Profile ── */}
                    <section className="bg-[#0f1629] border border-[#1e2d45] rounded-xl overflow-hidden">
                        <div className="flex items-center gap-3 px-5 py-4 border-b border-[#1e2d45] bg-[#111827]">
                            <Target size={18} className="text-blue-400" />
                            <h2 className="font-semibold text-[#e2e8f0]">Trading Profile</h2>
                        </div>
                        <div className="p-5 space-y-5">
                            <div>
                                <label className="block text-sm font-medium text-[#94a3b8] mb-1.5">
                                    Target Balance ($)
                                </label>
                                <div className="relative">
                                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[#475569] font-medium">$</span>
                                    <input
                                        type="number"
                                        value={balance}
                                        onChange={(e) => setBalance(e.target.value)}
                                        className="w-full bg-[#1a2235] border border-[#1e2d45] rounded-lg py-2.5 pl-8 pr-4 text-white focus:outline-none focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/50"
                                        placeholder="10000"
                                    />
                                </div>
                            </div>

                            <div>
                                <div className="flex items-center justify-between mb-1.5">
                                    <label className="block text-sm font-medium text-[#94a3b8]">
                                        Risk Per Trade (%)
                                    </label>
                                    <span className="text-sm font-bold text-white">{riskPerTrade}%</span>
                                </div>
                                <input
                                    type="range"
                                    min="0.5"
                                    max="5"
                                    step="0.5"
                                    value={riskPerTrade}
                                    onChange={(e) => setRiskPerTrade(e.target.value)}
                                    className="w-full h-2 bg-[#1e2d45] rounded-lg appearance-none cursor-pointer accent-blue-500"
                                />
                                <div className="flex justify-between text-[10px] text-[#475569] mt-2 font-medium">
                                    <span>Conservative (0.5%)</span>
                                    <span>Aggressive (5.0%)</span>
                                </div>
                            </div>
                        </div>
                    </section>

                    {/* ── AI Strategy Overrides ── */}
                    <section className="bg-[#0f1629] border border-[#1e2d45] rounded-xl overflow-hidden">
                        <div className="flex items-center gap-3 px-5 py-4 border-b border-[#1e2d45] bg-[#111827]">
                            <Cpu size={18} className="text-purple-400" />
                            <h2 className="font-semibold text-[#e2e8f0]">AI Strategy Overrides</h2>
                        </div>
                        <div className="p-5 space-y-6">

                            {/* Strict ICC Toggle */}
                            <div className="flex items-center justify-between">
                                <div>
                                    <h3 className="text-sm font-medium text-white">Strict ICC Mode</h3>
                                    <p className="text-[11px] text-[#64748b] mt-0.5">Force Gemini to only approve valid HH/HL or LL/LH structures.</p>
                                </div>
                                <label className="relative inline-flex items-center cursor-pointer shrink-0">
                                    <input
                                        type="checkbox"
                                        className="sr-only peer"
                                        checked={strictIcc}
                                        onChange={(e) => setStrictIcc(e.target.checked)}
                                    />
                                    <div className="w-11 h-6 bg-[#1e2d45] peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-purple-500"></div>
                                </label>
                            </div>

                            <hr className="border-[#1e2d45]" />

                            {/* Min R/R Dropdown */}
                            <div>
                                <label className="block text-sm font-medium text-[#94a3b8] mb-1.5">
                                    Minimum R/R Ratio
                                </label>
                                <select
                                    value={minRR}
                                    onChange={(e) => setMinRR(e.target.value)}
                                    className="w-full bg-[#1a2235] border border-[#1e2d45] rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-purple-500/50 appearance-none bg-no-repeat bg-[url('data:image/svg+xml;charset=US-ASCII,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%22292.4%22%20height%3D%22292.4%22%3E%3Cpath%20fill%3D%22%2394a3b8%22%20d%3D%22M287%2069.4a17.6%2017.6%200%200%200-13-5.4H18.4c-5%200-9.3%201.8-12.9%205.4A17.6%2017.6%200%200%200%200%2082.2c0%205%201.8%209.3%205.4%2012.9l128%20127.9c3.6%203.6%207.8%205.4%2012.8%205.4s9.2-1.8%2012.8-5.4L287%2095c3.5-3.5%205.4-7.8%205.4-12.8%200-5-1.9-9.2-5.5-12.8z%22%2F%3E%3C%2Fsvg%3E')] bg-[length:10px_10px] bg-[position:calc(100%-1rem)_center]"
                                >
                                    <option value="1:2">1:2 (Lenient)</option>
                                    <option value="1:3">1:3 (Standard)</option>
                                    <option value="1:4">1:4 (Strict ICC)</option>
                                    <option value="1:5">1:5 (Aggressive)</option>
                                </select>
                            </div>
                        </div>
                    </section>

                    {/* ── Connectivity Health Check ── */}
                    <section className="bg-[#0f1629] border border-[#1e2d45] rounded-xl overflow-hidden">
                        <div className="flex items-center gap-3 px-5 py-4 border-b border-[#1e2d45] bg-[#111827]">
                            <Activity size={18} className="text-emerald-400" />
                            <h2 className="font-semibold text-[#e2e8f0]">Health Check</h2>
                        </div>
                        <div className="p-5 flex flex-col gap-4">

                            {/* Neon DB */}
                            <div className="flex items-center justify-between p-3 rounded-lg border border-[#1e2d45] bg-[#1a2235]">
                                <div className="flex items-center gap-3">
                                    <div className="w-8 h-8 rounded bg-emerald-500/10 flex items-center justify-center">
                                        <Database size={16} className="text-emerald-400" />
                                    </div>
                                    <div>
                                        <div className="text-sm font-medium text-white">Database (Neon)</div>
                                        <div className="text-[10px] text-[#64748b]">PostgreSQL Cloud</div>
                                    </div>
                                </div>
                                <span className={clsx(
                                    "px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider rounded border",
                                    dbConnected
                                        ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                                        : "bg-rose-500/10 text-rose-400 border-rose-500/20"
                                )}>
                                    {dbConnected ? "Connected" : "Disconnected"}
                                </span>
                            </div>

                            {/* Telegram Bot */}
                            <div className="flex items-center justify-between p-3 rounded-lg border border-[#1e2d45] bg-[#1a2235]">
                                <div className="flex items-center gap-3">
                                    <div className="w-8 h-8 rounded bg-blue-500/10 flex items-center justify-center">
                                        <Send size={16} className="text-blue-400" />
                                    </div>
                                    <div>
                                        <div className="text-sm font-medium text-white">Telegram Bot</div>
                                        <div className="text-[10px] text-[#64748b]">Push Notifications</div>
                                    </div>
                                </div>
                                <span className={clsx(
                                    "px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider rounded border",
                                    tgConnected
                                        ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                                        : "bg-rose-500/10 text-rose-400 border-rose-500/20"
                                )}>
                                    {tgConnected ? "Connected" : "Disconnected"}
                                </span>
                            </div>

                        </div>
                    </section>

                    {/* ── Appearance ── */}
                    <section className="bg-[#0f1629] border border-[#1e2d45] rounded-xl overflow-hidden">
                        <div className="flex items-center gap-3 px-5 py-4 border-b border-[#1e2d45] bg-[#111827]">
                            <Palette size={18} className="text-pink-400" />
                            <h2 className="font-semibold text-[#e2e8f0]">Appearance</h2>
                        </div>
                        <div className="p-5">
                            <label className="block text-sm font-medium text-[#94a3b8] mb-1.5">
                                TradingView Theme
                            </label>
                            <div className="flex rounded-lg overflow-hidden border border-[#1e2d45]">
                                <button
                                    onClick={() => setTvTheme("dark")}
                                    className={clsx(
                                        "block flex-1 py-2 text-sm font-medium transition-colors",
                                        tvTheme === "dark"
                                            ? "bg-[#1e2d45] text-white"
                                            : "bg-[#111827] text-[#64748b] hover:text-[#94a3b8]"
                                    )}
                                >
                                    Dark
                                </button>
                                <button
                                    onClick={() => setTvTheme("light")}
                                    className={clsx(
                                        "block flex-1 py-2 text-sm font-medium transition-colors border-l border-[#1e2d45]",
                                        tvTheme === "light"
                                            ? "bg-[#e2e8f0] text-[#0f1629]"
                                            : "bg-[#111827] text-[#64748b] hover:text-[#94a3b8]"
                                    )}
                                >
                                    Light
                                </button>
                            </div>
                            <p className="text-[11px] text-[#64748b] mt-3">
                                Refreshes the Markets page charts to match your system preference. The app wrapper remains dark mode natively.
                            </p>
                        </div>
                    </section>

                    {/* ── MetaApi Configuration ── */}
                    <section className="bg-[#0f1629] border border-[#1e2d45] rounded-xl overflow-hidden md:col-span-2">
                        <div className="flex items-center gap-3 px-5 py-4 border-b border-[#1e2d45] bg-[#111827]">
                            <Save size={18} className="text-orange-400" />
                            <h2 className="font-semibold text-[#e2e8f0]">MetaApi Configuration</h2>
                        </div>
                        <div className="p-5 grid grid-cols-1 md:grid-cols-2 gap-5">
                            <div>
                                <label className="block text-sm font-medium text-[#94a3b8] mb-1.5">
                                    MetaApi Token
                                </label>
                                <input
                                    type="password"
                                    value={metaApiToken}
                                    onChange={(e) => setMetaApiToken(e.target.value)}
                                    className="w-full bg-[#1a2235] border border-[#1e2d45] rounded-lg py-2.5 px-4 text-white focus:outline-none focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/50"
                                    placeholder="Enter your MetaApi token..."
                                />
                                <p className="text-[11px] text-[#64748b] mt-1.5">Your secret token used for placing real/paper trades on MetaTrader.</p>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-[#94a3b8] mb-1.5">
                                    MetaApi Account ID
                                </label>
                                <input
                                    type="text"
                                    value={metaApiAccountId}
                                    onChange={(e) => setMetaApiAccountId(e.target.value)}
                                    className="w-full bg-[#1a2235] border border-[#1e2d45] rounded-lg py-2.5 px-4 text-white focus:outline-none focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/50"
                                    placeholder="Enter your MetaApi account ID..."
                                />
                                <p className="text-[11px] text-[#64748b] mt-1.5">The specific account ID within your MetaApi workspace.</p>
                            </div>
                        </div>
                    </section>

                </div>

                <div className="mt-8 text-center pb-8">
                    <p className="text-[11px] text-[#475569]">TradePulse UI v0.1.0 • Built with Next.js 14</p>
                </div>
            </div>
        </div>
    );
}
