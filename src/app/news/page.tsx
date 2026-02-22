export const dynamic = "force-dynamic";

import Link from "next/link";
import {
    LayoutDashboard, ChevronRight, Newspaper, RefreshCw,
    Star, TrendingUp, TrendingDown, Minus, Radio, ExternalLink,
} from "lucide-react";
import { fetchCryptoCompare, type NewsItem } from "@/app/api/news/route";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatEAT(iso: string): string {
    return new Intl.DateTimeFormat("en-US", {
        month: "short",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
        hour12: false,
        timeZone: "Africa/Nairobi",
    }).format(new Date(iso)) + " EAT";
}

function timeAgo(iso: string): string {
    const diffMs = Date.now() - new Date(iso).getTime();
    const mins = Math.floor(diffMs / 60000);
    if (mins < 1) return "just now";
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    return `${Math.floor(hrs / 24)}d ago`;
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function SentimentBadge({ sentiment }: { sentiment: NewsItem["sentiment"] }) {
    if (sentiment === "bullish")
        return (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-emerald-500/10 text-emerald-300 border border-emerald-500/25">
                <TrendingUp size={9} /> Bullish
            </span>
        );
    if (sentiment === "bearish")
        return (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-rose-500/10 text-rose-300 border border-rose-500/25">
                <TrendingDown size={9} /> Bearish
            </span>
        );
    return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-[#1a2235] text-[#64748b] border border-[#1e2d45]">
            <Minus size={9} /> Neutral
        </span>
    );
}

function NewsCard({ item }: { item: NewsItem }) {
    const borderColor = item.isHighImpact
        ? "border-amber-500/40"
        : item.sentiment === "bullish"
            ? "border-emerald-500/20"
            : item.sentiment === "bearish"
                ? "border-rose-500/20"
                : "border-[#1e2d45]";

    return (
        <a
            href={item.url}
            target="_blank"
            rel="noopener noreferrer"
            className={`group block rounded-xl border bg-[#0d1525] hover:bg-[#111827]
                        transition-all duration-200 p-4 ${borderColor}`}
        >
            {/* Top row: source + high-impact star + time-ago */}
            <div className="flex flex-wrap items-center gap-x-2 gap-y-2 mb-2.5">
                {/* Source badge */}
                <span className="px-2 py-0.5 rounded-md text-[9px] font-bold uppercase tracking-widest bg-[#1a2235] text-[#94a3b8] border border-[#1e2d45]">
                    {item.source}
                </span>

                {/* Currency tags */}
                {item.currencies.slice(0, 3).map((c) => (
                    <span key={c} className="px-1.5 py-0.5 rounded text-[9px] font-semibold text-blue-300/70 bg-blue-500/10">
                        {c}
                    </span>
                ))}

                <div className="flex-1 min-w-[20px]" />

                {/* High-impact star */}
                {item.isHighImpact && (
                    <span className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider bg-amber-500/10 text-amber-300 border border-amber-500/30">
                        <Star size={9} fill="currentColor" /> High Impact
                    </span>
                )}

                {/* Time ago */}
                <span className="text-[10px] text-[#475569] tabular-nums shrink-0">
                    {timeAgo(item.publishedAt)}
                </span>
            </div>

            {/* Headline */}
            <p className="text-sm font-medium text-white leading-snug mb-3 group-hover:text-blue-200 transition-colors line-clamp-2">
                {item.title}
            </p>

            {/* Bottom row: sentiment + timestamp + link icon */}
            <div className="flex items-center gap-2">
                <SentimentBadge sentiment={item.sentiment} />
                <span className="ml-auto text-[10px] text-[#334155] tabular-nums">
                    {formatEAT(item.publishedAt)}
                </span>
                <ExternalLink size={11} className="text-[#334155] group-hover:text-blue-400 transition-colors" />
            </div>
        </a>
    );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default async function NewsPage() {
    let items: NewsItem[] = [];
    let fetchError = false;

    try {
        items = await fetchCryptoCompare();

        // Sort: high-impact first, then by date descending
        items.sort((a, b) => {
            if (a.isHighImpact !== b.isHighImpact) return a.isHighImpact ? -1 : 1;
            return new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime();
        });
    } catch {
        fetchError = true;
    }

    const highImpact = items.filter((i) => i.isHighImpact);
    const regular = items.filter((i) => !i.isHighImpact);

    return (
        <div className="min-h-screen bg-[#0a0f1e] text-white">

            {/* ── Top Nav ────────────────────────────────────────────────── */}
            <nav className="sticky top-0 z-20 flex items-center gap-3 px-6 py-3
                           bg-[#0a0f1e]/80 backdrop-blur-md border-b border-[#1e2d45]">
                <Link
                    href="/"
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm
                               text-[#94a3b8] hover:text-white hover:bg-[#1a2235]
                               border border-transparent hover:border-[#1e2d45] transition-all duration-150"
                >
                    <LayoutDashboard size={14} /> Dashboard
                </Link>
                <ChevronRight size={14} className="text-[#334155]" />
                <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm
                                font-medium text-blue-300 bg-blue-500/10 border border-blue-500/20">
                    <Newspaper size={14} /> News
                </span>
                <div className="flex-1" />
                <Link
                    href="/news"
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs
                               text-[#475569] hover:text-white hover:bg-[#1a2235]
                               border border-[#1e2d45] hover:border-blue-500/30 transition-all duration-150"
                >
                    <RefreshCw size={12} /> Refresh
                </Link>
            </nav>

            {/* ── Page content ────────────────────────────────────────────── */}
            <div className="p-6 md:p-10 max-w-5xl mx-auto">

                {/* Page header */}
                <div className="flex items-center gap-3 mb-8">
                    <div className="w-10 h-10 rounded-xl bg-[#1a2235] flex items-center justify-center">
                        <Radio size={18} className="text-blue-400" />
                    </div>
                    <div>
                        <h1 className="text-xl font-bold text-white">Market News Feed</h1>
                        <p className="text-xs text-[#475569]">
                            Crypto &amp; Forex headlines • Sentiment-tagged • EAT timezone
                        </p>
                    </div>
                    <div className="ml-auto flex items-center gap-3 text-xs text-[#475569]">
                        <span className="flex items-center gap-1.5">
                            <span className="w-2 h-2 rounded-full bg-amber-400" />
                            {highImpact.length} high-impact
                        </span>
                        <span className="flex items-center gap-1.5">
                            <span className="w-2 h-2 rounded-full bg-blue-400" />
                            {items.length} total
                        </span>
                    </div>
                </div>

                {/* Error / empty state */}
                {(fetchError || items.length === 0) && (
                    <div className="flex flex-col items-center justify-center py-40 gap-4">
                        <div className="relative w-16 h-16 rounded-2xl bg-[#111827] border border-[#1e2d45] flex items-center justify-center">
                            <Radio size={28} className="text-[#334155]" />
                            <span className="absolute top-1 right-1 w-2.5 h-2.5 rounded-full bg-blue-500 live-dot" />
                        </div>
                        <p className="text-[#475569] text-sm font-medium">Scanning the airwaves…</p>
                        <p className="text-[#334155] text-xs max-w-xs text-center">
                            {fetchError
                                ? "Could not reach the news source. Check your connection and refresh."
                                : "No headlines found. Live updates arrive within a few minutes."}
                        </p>
                        <Link
                            href="/news"
                            className="mt-2 flex items-center gap-2 px-4 py-2 rounded-lg bg-[#1a2235] border border-[#1e2d45] text-sm text-[#94a3b8] hover:text-white hover:border-blue-500/30 transition-all"
                        >
                            <RefreshCw size={13} /> Try again
                        </Link>
                    </div>
                )}

                {/* ── High-impact section ─────────────────────────────────── */}
                {highImpact.length > 0 && (
                    <section className="mb-10">
                        <div className="flex items-center gap-2 mb-4">
                            <Star size={13} className="text-amber-400" fill="currentColor" />
                            <h2 className="text-xs font-semibold uppercase tracking-widest text-amber-400">
                                High-Impact Events
                            </h2>
                            <span className="ml-auto text-[10px] text-[#475569]">
                                Fed · CPI · NFP · ETF · FOMC
                            </span>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            {highImpact.map((item) => <NewsCard key={item.id} item={item} />)}
                        </div>
                    </section>
                )}

                {/* ── Regular news ────────────────────────────────────────── */}
                {regular.length > 0 && (
                    <section>
                        <div className="flex items-center gap-2 mb-4">
                            <Newspaper size={13} className="text-[#475569]" />
                            <h2 className="text-xs font-semibold uppercase tracking-widest text-[#475569]">
                                Latest Headlines
                            </h2>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            {regular.map((item) => <NewsCard key={item.id} item={item} />)}
                        </div>
                    </section>
                )}
            </div>
        </div>
    );
}
