/**
 * Helix — useWebSocket hook
 * Connects to the project WebSocket for real-time updates.
 */

"use client";

import { useEffect, useRef, useCallback } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { tokenStore } from "@/lib/api-client";
import { toast } from "sonner";

interface WSMessage {
  type: string;
  data: Record<string, unknown>;
}

type MessageHandler = (msg: WSMessage) => void;

export function useProjectWebSocket(projectId: string | null) {
  const wsRef = useRef<WebSocket | null>(null);
  const queryClient = useQueryClient();
  const reconnectTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const reconnectAttempts = useRef(0);

  const handleMessage = useCallback(
    (event: MessageEvent) => {
      try {
        const msg: WSMessage = JSON.parse(event.data);

        switch (msg.type) {
          case "issue.created":
          case "issue.updated":
          case "issue.deleted":
          case "issue.moved":
            // Invalidate issues list so UI re-fetches
            queryClient.invalidateQueries({ queryKey: ["issues", projectId] });
            break;

          case "comment.added":
          case "comment.updated":
          case "comment.deleted":
            queryClient.invalidateQueries({
              queryKey: ["comments", (msg.data as any).issue_id],
            });
            break;
            
          case "note.created":
          case "note.updated":
          case "note.deleted":
            queryClient.invalidateQueries({ queryKey: ["notes", projectId] });
            break;

          default:
            break;
        }
      } catch {
        // Ignore malformed messages
      }
    },
    [projectId, queryClient]
  );

  const connect = useCallback(() => {
    if (!projectId) return;
    const token = tokenStore.get();
    if (!token) return;

    const wsUrl = `${process.env.NEXT_PUBLIC_WS_URL || "ws://localhost:8000"}/api/v1/ws/projects/${projectId}?token=${token}`;

    const ws = new WebSocket(wsUrl);

    ws.onopen = () => {
      reconnectAttempts.current = 0;
    };

    ws.onmessage = handleMessage;

    ws.onclose = (e) => {
      // Exponential backoff reconnect (max 30s)
      if (e.code !== 4001) {
        const delay = Math.min(1000 * 2 ** reconnectAttempts.current, 30_000);
        reconnectAttempts.current += 1;
        reconnectTimer.current = setTimeout(connect, delay);
      }
    };

    ws.onerror = () => {
      ws.close();
    };

    wsRef.current = ws;
  }, [projectId, handleMessage]);

  useEffect(() => {
    connect();
    return () => {
      if (reconnectTimer.current) clearTimeout(reconnectTimer.current);
      wsRef.current?.close(1000, "Component unmounted");
    };
  }, [connect]);

  const sendMessage = useCallback((type: string, data: unknown) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type, data }));
    }
  }, []);

  return { sendMessage };
}
