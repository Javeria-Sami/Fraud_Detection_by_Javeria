/**
 * Real-Time WebSocket Event Client Service.
 * Section 11 — Real-Time Event System.
 * 
 * Provides robust connection lifecycle management, JWT authentication,
 * exponential backoff reconnection, heartbeat keepalive, and typed event dispatching.
 */

export type RealtimeConnectionState = 'CONNECTING' | 'CONNECTED' | 'DISCONNECTED' | 'RECONNECTING' | 'ERROR';

export interface EventEnvelope<T = any> {
  event_id: string;
  event_type: string;
  schema_version: string;
  occurred_at: string;
  source: string;
  entity_type: string;
  entity_id: string;
  severity?: string;
  correlation_id?: string;
  payload: T;
}

export type EventCallback<T = any> = (event: EventEnvelope<T>) => void;
export type StateChangeCallback = (state: RealtimeConnectionState) => void;

export class RealtimeService {
  private socket: WebSocket | null = null;
  private url: string;
  private token: string | null = null;
  private state: RealtimeConnectionState = 'DISCONNECTED';
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 10;
  private baseReconnectDelayMs = 1000;
  private maxReconnectDelayMs = 15000;
  private reconnectTimeoutId: any = null;
  private heartbeatIntervalId: any = null;
  private heartbeatIntervalMs = 15000;

  private listeners: Map<string, Set<EventCallback>> = new Map();
  private stateListeners: Set<StateChangeCallback> = new Set();
  private activeSubscriptions: Set<string> = new Set();

  constructor(customUrl?: string) {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const host = window.location.hostname === 'localhost' ? 'localhost:8000' : window.location.host;
    this.url = customUrl || `${protocol}//${host}/ws/live`;
  }

  public getState(): RealtimeConnectionState {
    return this.state;
  }

  private setState(newState: RealtimeConnectionState) {
    if (this.state !== newState) {
      this.state = newState;
      this.stateListeners.forEach(cb => cb(newState));
    }
  }

  public onStateChange(cb: StateChangeCallback): () => void {
    this.stateListeners.add(cb);
    cb(this.state);
    return () => this.stateListeners.delete(cb);
  }

  public connect(token?: string) {
    if (token) this.token = token;
    if (this.socket && (this.socket.readyState === WebSocket.OPEN || this.socket.readyState === WebSocket.CONNECTING)) {
      return;
    }

    this.setState(this.reconnectAttempts > 0 ? 'RECONNECTING' : 'CONNECTING');

    const connectUrl = this.token ? `${this.url}?token=${encodeURIComponent(this.token)}` : this.url;
    try {
      this.socket = new WebSocket(connectUrl);

      this.socket.onopen = () => {
        this.setState('CONNECTED');
        this.reconnectAttempts = 0;
        this.startHeartbeat();

        // Resubscribe to previous topics
        this.activeSubscriptions.forEach(topic => {
          this.send({ action: 'subscribe', topic });
        });
      };

      this.socket.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          if (data.event_type) {
            // Dispatch to specific listeners
            const callbacks = this.listeners.get(data.event_type);
            if (callbacks) {
              callbacks.forEach(cb => cb(data));
            }
            // Dispatch to wildcard listeners
            const wildcardCallbacks = this.listeners.get('*');
            if (wildcardCallbacks) {
              wildcardCallbacks.forEach(cb => cb(data));
            }
          }
        } catch (err) {
          console.debug('[RealtimeService] Non-JSON message received:', event.data);
        }
      };

      this.socket.onclose = (event) => {
        this.stopHeartbeat();
        this.setState('DISCONNECTED');
        if (event.code !== 1000 && event.code !== 1008) {
          this.scheduleReconnect();
        }
      };

      this.socket.onerror = () => {
        this.setState('ERROR');
      };
    } catch (err) {
      this.setState('ERROR');
      this.scheduleReconnect();
    }
  }

  public disconnect() {
    if (this.reconnectTimeoutId) {
      clearTimeout(this.reconnectTimeoutId);
      this.reconnectTimeoutId = null;
    }
    this.stopHeartbeat();
    if (this.socket) {
      this.socket.close(1000, 'Client disconnected');
      this.socket = null;
    }
    this.setState('DISCONNECTED');
  }

  private scheduleReconnect() {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.warn('[RealtimeService] Max reconnect attempts reached.');
      this.setState('ERROR');
      return;
    }

    const delay = Math.min(
      this.maxReconnectDelayMs,
      this.baseReconnectDelayMs * Math.pow(1.5, this.reconnectAttempts)
    ) + (Math.random() * 500);

    this.reconnectAttempts++;
    this.reconnectTimeoutId = setTimeout(() => {
      this.connect();
    }, delay);
  }

  private startHeartbeat() {
    this.stopHeartbeat();
    this.heartbeatIntervalId = setInterval(() => {
      if (this.socket && this.socket.readyState === WebSocket.OPEN) {
        this.socket.send(JSON.stringify({ action: 'ping' }));
      }
    }, this.heartbeatIntervalMs);
  }

  private stopHeartbeat() {
    if (this.heartbeatIntervalId) {
      clearInterval(this.heartbeatIntervalId);
      this.heartbeatIntervalId = null;
    }
  }

  public send(data: Record<string, any>) {
    if (this.socket && this.socket.readyState === WebSocket.OPEN) {
      this.socket.send(JSON.stringify(data));
    }
  }

  public subscribe(topic: string) {
    this.activeSubscriptions.add(topic);
    this.send({ action: 'subscribe', topic });
  }

  public unsubscribe(topic: string) {
    this.activeSubscriptions.delete(topic);
    this.send({ action: 'unsubscribe', topic });
  }

  public on<T = any>(eventType: string, callback: EventCallback<T>): () => void {
    if (!this.listeners.has(eventType)) {
      this.listeners.set(eventType, new Set());
    }
    this.listeners.get(eventType)!.add(callback);
    return () => this.off(eventType, callback);
  }

  public off(eventType: string, callback: EventCallback) {
    const callbacks = this.listeners.get(eventType);
    if (callbacks) {
      callbacks.delete(callback);
      if (callbacks.size === 0) {
        this.listeners.delete(eventType);
      }
    }
  }
}

// Global singleton instance
export const realtimeService = new RealtimeService();
