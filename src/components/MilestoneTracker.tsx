import React from 'react';
import { Target } from 'lucide-react';

interface MilestoneTrackerProps {
    currentBalance: number;
}

const TARGET_BALANCE = 10000;

export default function MilestoneTracker({ currentBalance }: MilestoneTrackerProps) {
    const percentage = Math.min((currentBalance / TARGET_BALANCE) * 100, 100);
    const remaining = Math.max(TARGET_BALANCE - currentBalance, 0);
    const isCompleted = currentBalance >= TARGET_BALANCE;

    return (
        <section className="bg-[#0f1629] border border-[#1e2d45] rounded-xl p-5 md:p-6 shadow-xl relative overflow-hidden">
            {/* Subtle background glow when completed */}
            {isCompleted && (
                <div className="absolute inset-0 bg-emerald-500/5 blur-3xl pointer-events-none" />
            )}

            <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-5 relative z-10">
                <div>
                    <div className="flex items-center gap-2 mb-2">
                        <div className="w-8 h-8 rounded-lg bg-blue-500/10 flex items-center justify-center border border-blue-500/20">
                            <Target size={16} className="text-blue-400" />
                        </div>
                        <h2 className="text-lg font-bold text-white tracking-tight">The $10K Challenge</h2>
                    </div>
                    <p className="text-sm text-[#94a3b8]">
                        Paper trading progress towards the funded account milestone.
                    </p>
                </div>

                <div className="text-left md:text-right">
                    <div className="text-2xl font-bold tabular-nums">
                        <span className={isCompleted ? "text-emerald-400" : "text-white"}>
                            ${currentBalance.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </span>
                        <span className="text-sm text-[#475569] font-medium ml-1">
                            / ${TARGET_BALANCE.toLocaleString()}
                        </span>
                    </div>
                </div>
            </div>

            <div className="relative z-10">
                {/* Progress Bar Container */}
                <div className="h-3 w-full bg-gray-800 rounded-full overflow-hidden shadow-inner">
                    <div
                        className={`h-full rounded-full transition-all duration-1000 ease-out bg-emerald-500 relative ${isCompleted ? 'bg-gradient-to-r from-emerald-500 to-emerald-400 shadow-[0_0_10px_rgba(16,185,129,0.5)]' : ''}`}
                        style={{ width: `${percentage}%` }}
                    >
                        {/* Shimmer effect inside the bar */}
                        {!isCompleted && percentage > 0 && (
                            <div className="absolute top-0 right-0 bottom-0 w-10 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full animate-[shimmer_2s_infinite]" />
                        )}
                    </div>
                </div>

                {/* Footer Metrics */}
                <div className="flex justify-between items-center mt-3 text-xs font-medium">
                    <span className="text-blue-400 bg-blue-500/10 px-2 py-0.5 rounded">
                        {percentage.toFixed(1)}% Complete
                    </span>
                    <span className="text-[#64748b]">
                        {isCompleted ? (
                            <span className="text-emerald-400 flex items-center gap-1">
                                🎉 Challenge Completed!
                            </span>
                        ) : (
                            `$${remaining.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} left to target`
                        )}
                    </span>
                </div>
            </div>

            <style dangerouslySetInnerHTML={{
                __html: `
                @keyframes shimmer {
                    100% {
                        transform: translateX(200%);
                    }
                }
            `}} />
        </section>
    );
}
