/**
 * Helix — WebSocket Client
 * Handles reconnecting WebSockets for real-time state synchronization.
 */

import { tokenStore } from "./api-client";

type WebSocketEventCallback = (data: any) => void;

class RealtimeClient {
  private ws: WebSocket | null = null;
  private url: string = "";
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 10;
  private isConnecting = false;
  private shouldReconnect = true;
  private pingInterval: ReturnType<typeof setInterval> | null = null;

  // Event listeners map: event_type -> callbacks[]
  private listeners: Map<string, Set<WebSocketEventCallback>> = new Map();

  /**
   * Connect to a specific project room.
   */
  public connect(projectId: string) {
    if (this.isConnecting) return;
    
    // Disconnect existing if changing rooms
    if (this.ws) {
      this.disconnect();
    }

    this.shouldReconnect = true;
    this.isConnecting = true;

    const token = tokenStore.get();
    if (!token) {
      console.warn("[Helix WS] No token available, cannot connect.");
      this.isConnecting = false;
      return;
    }

    // Determine WS protocol
    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    // Ensure we use the correct backend host (fallback to localhost:8000 for local dev if not configured)
    const host = process.env.NEXT_PUBLIC_API_URL 
      ? new URL(process.env.NEXT_PUBLIC_API_URL).host 
      : "localhost:8000";
    
    this.url = `${protocol}//${host}/api/v1/ws/projects/${projectId}?token=${token}`;

    console.log(`[Helix WS] Connecting to ${this.url.replace(token, "***")}`);
    this.ws = new WebSocket(this.url);

    this.ws.onopen = this.handleOpen.bind(this);
    this.ws.onmessage = this.handleMessage.bind(this);
    this.ws.onclose = this.handleClose.bind(this);
    this.ws.onerror = this.handleError.bind(this);
  }

  public disconnect() {
    this.shouldReconnect = false;
    if (this.pingInterval) clearInterval(this.pingInterval);
    if (this.ws) {
      this.ws.close(1000, "Client disconnected");
      this.ws = null;
    }
    this.isConnecting = false;
  }

  public on(eventType: string, callback: WebSocketEventCallback) {
    if (!this.listeners.has(eventType)) {
      this.listeners.set(eventType, new Set());
    }
    this.listeners.get(eventType)?.add(callback);
    
    // Return an unsubscribe function
    return () => {
      this.listeners.get(eventType)?.delete(callback);
    };
  }

  public send(type: string, data: any = {}) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({ type, data }));
    } else {
      console.warn("[Helix WS] Cannot send message, socket is not open", type);
    }
  }

  private handleOpen() {
    console.log("[Helix WS] Connected successfully.");
    this.isConnecting = false;
    this.reconnectAttempts = 0;

    // Start ping/pong to keep connection alive
    if (this.pingInterval) clearInterval(this.pingInterval);
    this.pingInterval = setInterval(() => {
      this.send("ping");
    }, 30000);
  }

  private handleMessage(event: MessageEvent) {
    try {
      const parsed = JSON.parse(event.data);
      if (parsed.type === "pong") return; // Ignore ping replies

      const callbacks = this.listeners.get(parsed.type);
      if (callbacks) {
        callbacks.forEach((cb) => cb(parsed.data));
      }
    } catch (e) {
      console.error("[Helix WS] Failed to parse message", e, event.data);
    }
  }

  private handleClose(event: CloseEvent) {
    console.log(`[Helix WS] Disconnected. Code: ${event.code}`);
    this.isConnecting = false;
    if (this.pingInterval) clearInterval(this.pingInterval);

    // Reconnect logic
    if (this.shouldReconnect && event.code !== 1000 && event.code !== 4001) {
      this.attemptReconnect();
    }
  }

  private handleError(error: Event) {
    console.error("[Helix WS] Error:", error);
    this.ws?.close(); // Force close to trigger reconnect
  }

  private attemptReconnect() {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.error("[Helix WS] Max reconnect attempts reached. Giving up.");
      return;
    }

    const delay = Math.min(1000 * Math.pow(2, this.reconnectAttempts), 30000);
    console.log(`[Helix WS] Reconnecting in ${delay}ms...`);
    
    setTimeout(() => {
      this.reconnectAttempts++;
      if (this.url) {
        // Extract project ID from URL to reconnect
        const match = this.url.match(/\/projects\/([^?]+)/);
        if (match && match[1]) {
          this.connect(match[1]);
        }
      }
    }, delay);
  }
}

export const realtimeClient = new RealtimeClient();
