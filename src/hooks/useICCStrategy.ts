"use client";

import { useEffect, useRef, useState } from "react";
import type { PriceData } from "./usePriceFeed";

// ─── Types ────────────────────────────────────────────────────────────────────

export type ICCSignal = "BUY" | "SELL" | "NEUTRAL";

export interface SwingPoint {
    type: "peak" | "trough";
    price: number;
    /** Position in the recentTicks array at time of detection */
    index: number;
}

export interface ICCStrategyResult {
    signal: ICCSignal;
    swingPoints: SwingPoint[];
    recentTicks: number[];
    /** Human-readable description of the pattern state */
    patternLabel: string;
    /** Key levels being watched */
    watchLevel: number | null;
}

// ─── Constants ────────────────────────────────────────────────────────────────

/** Number of bars on EACH side required to confirm a swing point. */
const SWING_BARS = 3;

/** Maximum length of the rolling tick buffer. */
const MAX_TICKS = 200;

// ─── Peak / Trough Detection ─────────────────────────────────────────────────

/**
 * Scans a price series and returns confirmed swing peaks and troughs.
 * A point at index i is a PEAK  if it is strictly greater than the
 * SWING_BARS prices before it AND the SWING_BARS prices after it.
 * A TROUGH is the inverse (strictly lower on both sides).
 * Points within SWING_BARS of either edge are skipped because we
 * cannot yet confirm them.
 */
function detectSwings(ticks: number[]): SwingPoint[] {
    const swings: SwingPoint[] = [];

    for (let i = SWING_BARS; i < ticks.length - SWING_BARS; i++) {
        const price = ticks[i];

        const leftBars = ticks.slice(i - SWING_BARS, i);
        const rightBars = ticks.slice(i + 1, i + SWING_BARS + 1);

        const isPeak =
            leftBars.every((p) => price > p) && rightBars.every((p) => price > p);

        const isTrough =
            leftBars.every((p) => price < p) && rightBars.every((p) => price < p);

        if (isPeak) swings.push({ type: "peak", price, index: i });
        else if (isTrough) swings.push({ type: "trough", price, index: i });
    }

    return swings;
}

// ─── ICC Pattern Evaluation ───────────────────────────────────────────────────

/**
 * Evaluates the ICC (Indication-Correction-Continuing) pattern.
 *
 * SELL sequence (all time-ordered):
 *   prevTrough → prevPeak → lastTrough [LL, Indication]
 *                         → lastPeak   [LH, Correction]
 *                         → currentPrice < lastTrough.price [Continuing → SELL]
 *
 * BUY sequence (all time-ordered):
 *   prevPeak → prevTrough → lastPeak   [HH, Indication]
 *                         → lastTrough [HL, Correction]
 *                         → currentPrice > lastPeak.price   [Continuing → BUY]
 */
function evaluateICC(
    swings: SwingPoint[],
    currentPrice: number
): Pick<ICCStrategyResult, "signal" | "patternLabel" | "watchLevel"> {
    const peaks = swings.filter((s) => s.type === "peak");
    const troughs = swings.filter((s) => s.type === "trough");

    const neutral = (label: string) => ({
        signal: "NEUTRAL" as ICCSignal,
        patternLabel: label,
        watchLevel: null,
    });

    if (peaks.length < 2 || troughs.length < 2) {
        return neutral("Accumulating data…");
    }

    // The two most recent peaks and troughs (by array order = time order)
    const prevPeak = peaks[peaks.length - 2];
    const lastPeak = peaks[peaks.length - 1];
    const prevTrough = troughs[troughs.length - 2];
    const lastTrough = troughs[troughs.length - 1];

    // ── SELL check ──────────────────────────────────────────────────────────────
    // Time order requirement: prevTrough < prevPeak < lastTrough < lastPeak
    const sellTimeOrder =
        prevTrough.index < prevPeak.index &&
        prevPeak.index < lastTrough.index &&
        lastTrough.index < lastPeak.index;

    const isLowerLow = lastTrough.price < prevTrough.price;   // Indication
    const isLowerHigh = lastPeak.price < prevPeak.price;      // Correction

    if (sellTimeOrder && isLowerLow && isLowerHigh) {
        if (currentPrice < lastTrough.price) {
            return {
                signal: "SELL",
                patternLabel: `ICC SELL ✓  LL ${lastTrough.price.toFixed(4)} → LH ${lastPeak.price.toFixed(4)} → Break`,
                watchLevel: lastTrough.price,
            };
        }
        return {
            signal: "NEUTRAL",
            patternLabel: `ICC SELL setup — watching break below ${lastTrough.price.toFixed(4)}`,
            watchLevel: lastTrough.price,
        };
    }

    // ── BUY check ───────────────────────────────────────────────────────────────
    // Time order requirement: prevPeak < prevTrough < lastPeak < lastTrough
    const buyTimeOrder =
        prevPeak.index < prevTrough.index &&
        prevTrough.index < lastPeak.index &&
        lastPeak.index < lastTrough.index;

    const isHigherHigh = lastPeak.price > prevPeak.price;     // Indication
    const isHigherLow = lastTrough.price > prevTrough.price;  // Correction

    if (buyTimeOrder && isHigherHigh && isHigherLow) {
        if (currentPrice > lastPeak.price) {
            return {
                signal: "BUY",
                patternLabel: `ICC BUY ✓  HH ${lastPeak.price.toFixed(4)} → HL ${lastTrough.price.toFixed(4)} → Break`,
                watchLevel: lastPeak.price,
            };
        }
        return {
            signal: "NEUTRAL",
            patternLabel: `ICC BUY setup — watching break above ${lastPeak.price.toFixed(4)}`,
            watchLevel: lastPeak.price,
        };
    }

    // ── Partial patterns (early hints) ─────────────────────────────────────────
    if (isLowerLow) return neutral(`Lower Low detected @ ${lastTrough.price.toFixed(4)} — watching for Lower High`);
    if (isHigherHigh) return neutral(`Higher High detected @ ${lastPeak.price.toFixed(4)} — watching for Higher Low`);

    return neutral("Scanning for ICC setup…");
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

/**
 * useICCStrategy
 *
 * @param data  Live PriceData for a single symbol (from usePriceFeed).
 *              Pass `null` / `undefined` while the feed is initialising.
 * @returns     Signal state, detected swing points, rolling tick buffer,
 *              a pattern label, and the price level being watched.
 */
export function useICCStrategy(
    data: PriceData | null | undefined
): ICCStrategyResult {
    const [recentTicks, setRecentTicks] = useState<number[]>([]);
    const [swingPoints, setSwingPoints] = useState<SwingPoint[]>([]);
    const [result, setResult] = useState<Pick<ICCStrategyResult, "signal" | "patternLabel" | "watchLevel">>({
        signal: "NEUTRAL",
        patternLabel: "Waiting for price feed…",
        watchLevel: null,
    });

    // Track the last price we appended to avoid duplicate ticks
    const lastPriceRef = useRef<number | null>(null);

    useEffect(() => {
        if (!data) return;
        const incoming = data.price;

        // Skip if the price hasn't moved (avoid unnecessary re-evaluations)
        if (incoming === lastPriceRef.current) return;
        lastPriceRef.current = incoming;

        setRecentTicks((prev) => {
            // Append new tick and cap the rolling window
            const updated = prev.length >= MAX_TICKS
                ? [...prev.slice(1), incoming]
                : [...prev, incoming];

            // Re-detect swings on the new series
            const swings = detectSwings(updated);
            setSwingPoints(swings);

            // Evaluate the ICC pattern with the current live price
            setResult(evaluateICC(swings, incoming));

            return updated;
        });
    }, [data?.price]); // re-run whenever the price changes

    return {
        signal: result.signal,
        patternLabel: result.patternLabel,
        watchLevel: result.watchLevel,
        swingPoints,
        recentTicks,
    };
}
