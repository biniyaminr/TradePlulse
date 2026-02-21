"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { usePriceFeed } from "@/hooks/usePriceFeed";

/**
 * Invisible background engine that pings the simulation API 
 * with the latest live prices to resolve hit SL/TP targets.
 */
export default function SimulatorEngine() {
    const { prices } = usePriceFeed();
    const router = useRouter();
    const isSimulating = useRef(false);

    useEffect(() => {
        if (Object.keys(prices).length === 0) return;

        const interval = setInterval(async () => {
            if (isSimulating.current) return;
            isSimulating.current = true;

            try {
                const res = await fetch("/api/simulate", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ prices }),
                });

                if (res.ok) {
                    const data = await res.json();
                    if (data.updatedCount > 0) {
                        // Hard refresh the portfolio server component to show the newly WON/LOST trades
                        router.refresh();
                    }
                }
            } catch (err) {
                console.error("Simulation engine failed to ping /api/simulate", err);
            } finally {
                isSimulating.current = false;
            }

        }, 3000); // Ping every 3 seconds

        return () => clearInterval(interval);
    }, [prices, router]);

    return null;
}
