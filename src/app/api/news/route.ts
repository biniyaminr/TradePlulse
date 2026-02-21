import { NextResponse } from "next/server";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface NewsItem {
    id: string;
    title: string;
    url: string;
    source: string;
    imageUrl: string;
    publishedAt: string; // ISO string
    sentiment: "bullish" | "bearish" | "neutral";
    isHighImpact: boolean;
    currencies: string[];
    body: string;
}

// ─── Keyword banks ────────────────────────────────────────────────────────────

const BULLISH_WORDS = [
    "bull", "surge", "rally", "soar", "gain", "rise", "jump",
    "record", "breakout", "recovery", "strong", "growth", "positive",
    "approval", "buy", "accumulate", "inflow", "upside", "high",
];

const BEARISH_WORDS = [
    "bear", "crash", "drop", "fall", "plunge", "decline", "weak",
    "dump", "sell", "outflow", "loss", "risk", "warning", "ban",
    "reject", "concern", "fear", "recession", "missed", "down",
];

const HIGH_IMPACT_WORDS = [
    "fed", "federal reserve", "interest rate", "rate hike", "rate cut",
    "cpi", "inflation", "nfp", "non-farm", "jobs", "gdp", "fomc",
    "etf", "sec", "halving", "regulation", "tariff", "powell",
    "unemployment", "treasury",
];

function detectSentiment(text: string): "bullish" | "bearish" | "neutral" {
    const lower = text.toLowerCase();
    const bullScore = BULLISH_WORDS.filter((w) => lower.includes(w)).length;
    const bearScore = BEARISH_WORDS.filter((w) => lower.includes(w)).length;
    if (bullScore > bearScore) return "bullish";
    if (bearScore > bullScore) return "bearish";
    return "neutral";
}

function detectHighImpact(text: string): boolean {
    const lower = text.toLowerCase();
    return HIGH_IMPACT_WORDS.some((w) => lower.includes(w));
}

// ─── CryptoCompare fetcher (free, no key required for news) ──────────────────

export async function fetchCryptoCompare(): Promise<NewsItem[]> {
    const res = await fetch(
        "https://min-api.cryptocompare.com/data/v2/news/?lang=EN&categories=BTC,ETH,XAU,Forex,Trading,Regulation&sortOrder=latest",
        {
            headers: { "User-Agent": "TradePulse/1.0" },
            next: { revalidate: 300 }, // cache 5 min
        }
    );

    if (!res.ok) throw new Error(`CryptoCompare ${res.status}`);

    const data = (await res.json()) as {
        Data: Array<{
            id: string;
            title: string;
            url: string;
            source: string;
            imageurl: string;
            published_on: number; // unix epoch
            body: string;
            categories: string;
            tags: string;
        }>;
    };

    if (!Array.isArray(data.Data)) throw new Error("Unexpected CryptoCompare response shape");

    return data.Data.slice(0, 40).map((item) => {
        const combinedText = `${item.title} ${item.body ?? ""}`;
        const currencies = item.categories
            ? item.categories.split("|").slice(0, 4)
            : [];

        return {
            id: item.id,
            title: item.title,
            url: item.url,
            source: item.source,
            imageUrl: item.imageurl ?? "",
            publishedAt: new Date(item.published_on * 1000).toISOString(),
            sentiment: detectSentiment(combinedText),
            isHighImpact: detectHighImpact(combinedText),
            currencies,
            body: item.body?.slice(0, 200) ?? "",
        };
    });
}

// ─── Route ────────────────────────────────────────────────────────────────────

export async function GET() {
    try {
        const items = await fetchCryptoCompare();

        // Sort: high-impact first, then by date descending
        items.sort((a, b) => {
            if (a.isHighImpact !== b.isHighImpact) return a.isHighImpact ? -1 : 1;
            return new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime();
        });

        return NextResponse.json({ items }, { status: 200 });
    } catch (err) {
        const message = err instanceof Error ? err.message : "Failed to fetch news";
        console.error("News API Error:", err);
        return NextResponse.json({ error: message }, { status: 500 });
    }
}
