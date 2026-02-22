"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { RefreshCw } from "lucide-react";

export default function SyncButton() {
    const [isSyncing, setIsSyncing] = useState(false);
    const router = useRouter();

    const handleSync = async () => {
        setIsSyncing(true);
        try {
            await fetch("/api/resolve");
            // Wait for a brief moment to ensure DB updates stabilize, though standard await handles most of it
            router.refresh();
        } catch (error) {
            console.error("Failed to sync market prices:", error);
        } finally {
            setIsSyncing(false);
        }
    };

    return (
        <button
            onClick={handleSync}
            disabled={isSyncing}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 border 
                ${isSyncing
                    ? "bg-gray-800 border-gray-700 text-gray-500 cursor-not-allowed"
                    : "bg-[#1a2235] border-[#1e2d45] text-white hover:bg-[#232e48] hover:border-blue-500/30"
                }`}
        >
            <RefreshCw size={14} className={isSyncing ? "animate-spin" : ""} />
            {isSyncing ? "Syncing Live Prices..." : "Sync Market Prices"}
        </button>
    );
}
