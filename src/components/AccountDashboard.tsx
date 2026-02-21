"use client";

import { Wallet, Target, TrendingUp, Edit2, X, Percent } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useRef, useEffect } from "react";
import clsx from "clsx";

export default function AccountDashboard({
    virtualBalance,
    riskPercentage,
    winRate,
    totalTrades,
    totalPnl
}: {
    virtualBalance: number,
    riskPercentage: number,
    winRate: number,
    totalTrades: number,
    totalPnl: number
}) {
    const router = useRouter();
    const [isUpdating, setIsUpdating] = useState(false);

    // Modal State
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [balanceInput, setBalanceInput] = useState("");
    const [riskInput, setRiskInput] = useState("");
    const inputRef = useRef<HTMLInputElement>(null);

    // Focus input when modal opens
    useEffect(() => {
        if (isModalOpen && inputRef.current) {
            inputRef.current.focus();
        }
    }, [isModalOpen]);

    const handleOpenModal = () => {
        setBalanceInput(virtualBalance.toString());
        setRiskInput(riskPercentage.toString());
        setIsModalOpen(true);
    };

    const handleCloseModal = () => {
        setIsModalOpen(false);
        setBalanceInput("");
        setRiskInput("");
    };

    const handleSaveSettings = async () => {
        if (balanceInput.trim() === "" || riskInput.trim() === "") return;

        const newBalance = parseFloat(balanceInput);
        const newRisk = parseFloat(riskInput);

        if (isNaN(newBalance) || newBalance < 0) {
            alert("Please enter a valid positive balance.");
            return;
        }
        if (isNaN(newRisk) || newRisk <= 0 || newRisk > 100) {
            alert("Please enter a valid risk percentage (e.g., 1.0).");
            return;
        }

        setIsUpdating(true);
        try {
            const res = await fetch("/api/account", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ newBalance, riskPercentage: newRisk }),
            });

            if (res.ok) {
                router.refresh();
                handleCloseModal();
            } else {
                alert("Failed to update account settings.");
            }
        } catch (error) {
            console.error("Error updating account", error);
            alert("Error updating account settings. Please check console.");
        } finally {
            setIsUpdating(false);
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === "Enter") {
            handleSaveSettings();
        } else if (e.key === "Escape") {
            handleCloseModal();
        }
    };

    return (
        <>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Balance & Risk */}
                <div className="p-5 rounded-xl border border-[#1e2d45] bg-[#0d1525] relative">
                    <div className="flex items-center gap-2 mb-2 text-[#94a3b8]">
                        <Wallet size={16} />
                        <h2 className="text-sm font-medium uppercase tracking-wider">Virtual Balance</h2>
                        <button
                            onClick={handleOpenModal}
                            disabled={isUpdating}
                            className="ml-auto text-[#64748b] hover:text-white transition-colors"
                            title="Edit Account Settings"
                        >
                            <Edit2 size={14} />
                        </button>
                    </div>
                    <p className="text-3xl font-bold tabular-nums">
                        ${virtualBalance.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </p>
                    <p className="text-xs text-[#475569] mt-1 flex items-center gap-1">
                        <Percent size={10} /> Risk Per Trade: <strong className="text-white">{riskPercentage.toFixed(1)}%</strong>
                    </p>
                    {isUpdating && <p className="text-[10px] text-blue-400 absolute bottom-3 right-5">Updating...</p>}
                </div>

                {/* Win Rate */}
                <div className="p-5 rounded-xl border border-[#1e2d45] bg-[#0d1525]">
                    <div className="flex items-center gap-2 mb-2 text-[#94a3b8]">
                        <Target size={16} />
                        <h2 className="text-sm font-medium uppercase tracking-wider">Win Rate</h2>
                    </div>
                    <p className="text-3xl font-bold tabular-nums">{winRate.toFixed(1)}%</p>
                    <p className="text-xs text-[#475569] mt-1">{totalTrades} total trades</p>
                </div>

                {/* Total PnL */}
                <div className="p-5 rounded-xl border border-[#1e2d45] bg-[#0d1525]">
                    <div className="flex items-center gap-2 mb-2 text-[#94a3b8]">
                        <TrendingUp size={16} />
                        <h2 className="text-sm font-medium uppercase tracking-wider">Overall PnL</h2>
                    </div>
                    <p className={`text-3xl font-bold tabular-nums flex items-center gap-2 ${totalPnl >= 0 ? "text-emerald-400" : "text-rose-400"}`}>
                        {totalPnl >= 0 ? "+" : "-"}${Math.abs(totalPnl).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </p>
                </div>
            </div>

            {/* Custom Modal for Account Settings */}
            {isModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
                    <div className="bg-[#111827] rounded-xl border border-[#1e2d45] shadow-2xl w-full max-w-sm overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                        {/* Header */}
                        <div className="flex flex-row items-center justify-between px-5 py-4 border-b border-[#1e2d45] bg-[#0d1525]">
                            <h3 className="font-semibold text-white">Edit Account</h3>
                            <button
                                onClick={handleCloseModal}
                                className="text-[#64748b] hover:text-white transition-colors"
                            >
                                <X size={18} />
                            </button>
                        </div>

                        {/* Body */}
                        <div className="p-5 space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-[#94a3b8] mb-2">
                                    Virtual Balance ($)
                                </label>
                                <input
                                    ref={inputRef}
                                    type="number"
                                    value={balanceInput}
                                    onChange={(e) => setBalanceInput(e.target.value)}
                                    onKeyDown={handleKeyDown}
                                    placeholder="10000.00"
                                    className="w-full bg-[#1a2235] border border-[#1e2d45] rounded-lg px-4 py-2.5 text-white placeholder-[#475569] focus:outline-none focus:ring-1 focus:ring-blue-500/50 focus:border-blue-500/50 transition-all font-mono"
                                />
                            </div>

                            <div>
                                <label className="flex items-center gap-2 text-sm font-medium text-[#94a3b8] mb-2">
                                    Risk Per Trade (%)
                                </label>
                                <input
                                    type="number"
                                    step="0.1"
                                    value={riskInput}
                                    onChange={(e) => setRiskInput(e.target.value)}
                                    onKeyDown={handleKeyDown}
                                    placeholder="1.0"
                                    className="w-full bg-[#1a2235] border border-[#1e2d45] rounded-lg px-4 py-2.5 text-white placeholder-[#475569] focus:outline-none focus:ring-1 focus:ring-blue-500/50 focus:border-blue-500/50 transition-all font-mono"
                                />
                                <p className="text-[11px] text-[#64748b] mt-3 leading-snug">
                                    This percentage dictates your exact position sizing based on your SL distance.
                                </p>
                            </div>
                        </div>

                        {/* Footer */}
                        <div className="flex items-center justify-end gap-3 px-5 py-4 border-t border-[#1e2d45] bg-[#0d1525]">
                            <button
                                onClick={handleCloseModal}
                                disabled={isUpdating}
                                className="px-4 py-2 rounded-lg text-sm font-medium text-[#94a3b8] hover:text-white hover:bg-[#1e2d45] transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleSaveSettings}
                                disabled={isUpdating}
                                className={clsx(
                                    "flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all shadow-lg",
                                    isUpdating
                                        ? "bg-blue-600/50 text-white/70 cursor-not-allowed"
                                        : "bg-blue-600 hover:bg-blue-500 text-white shadow-blue-500/20"
                                )}
                            >
                                {isUpdating ? "Saving..." : "Save Settings"}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}
