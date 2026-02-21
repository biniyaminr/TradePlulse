"use client";

import { useEffect, useRef, useState, useCallback } from "react";

export type ReadyState = 0 | 1 | 2 | 3;

export interface UseWebSocketReturn {
    lastMessage: MessageEvent | null;
    readyState: ReadyState;
    sendMessage: (data: string) => void;
}

const RECONNECT_DELAY_MS = 3000;

export function useWebSocket(url: string | null): UseWebSocketReturn {
    const [lastMessage, setLastMessage] = useState<MessageEvent | null>(null);
    const [readyState, setReadyState] = useState<ReadyState>(3); // CLOSED
    const wsRef = useRef<WebSocket | null>(null);
    const reconnectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const shouldReconnectRef = useRef(true);

    const connect = useCallback(() => {
        if (!url) return;

        try {
            const ws = new WebSocket(url);
            wsRef.current = ws;

            ws.onopen = () => setReadyState(1);
            ws.onclose = () => {
                setReadyState(3);
                if (shouldReconnectRef.current) {
                    reconnectTimerRef.current = setTimeout(connect, RECONNECT_DELAY_MS);
                }
            };
            ws.onerror = () => setReadyState(3);
            ws.onmessage = (event) => setLastMessage(event);

            setReadyState(0); // CONNECTING
        } catch {
            setReadyState(3);
        }
    }, [url]);

    useEffect(() => {
        shouldReconnectRef.current = true;
        connect();

        return () => {
            shouldReconnectRef.current = false;
            if (reconnectTimerRef.current) clearTimeout(reconnectTimerRef.current);
            wsRef.current?.close();
        };
    }, [connect]);

    const sendMessage = useCallback((data: string) => {
        if (wsRef.current?.readyState === WebSocket.OPEN) {
            wsRef.current.send(data);
        }
    }, []);

    return { lastMessage, readyState, sendMessage };
}
