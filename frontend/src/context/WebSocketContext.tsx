import React, { createContext, useContext, useEffect, useState, useRef } from 'react';
import { WebSocketEvent, Transaction, Alert } from '../types';

type WSStatus = 'CONNECTED' | 'RECONNECTING' | 'DISCONNECTED';

interface WebSocketContextType {
  status: WSStatus;
  latestTransaction: Transaction | null;
  latestAlert: Alert | null;
  liveAlerts: Alert[];
  subscribe: (eventType: string, callback: (payload: any) => void) => () => void;
  clearAlerts: () => void;
}

const WebSocketContext = createContext<WebSocketContextType | undefined>(undefined);

export const WebSocketProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [status, setStatus] = useState<WSStatus>('DISCONNECTED');
  const [latestTransaction, setLatestTransaction] = useState<Transaction | null>(null);
  const [latestAlert, setLatestAlert] = useState<Alert | null>(null);
  const [liveAlerts, setLiveAlerts] = useState<Alert[]>([]);
  
  const wsRef = useRef<WebSocket | null>(null);
  const listenersRef = useRef<Map<string, Set<(payload: any) => void>>>(new Map());
  const reconnectTimeoutRef = useRef<any>(null);
  const reconnectAttemptsRef = useRef<number>(0);
  const maxReconnectAttempts = 5;

  const computeWsUrl = () => {
    const envWsUrl = (import.meta as any).env?.VITE_WS_URL;
    if (envWsUrl) {
      return envWsUrl;
    }
    const envApiUrl = (import.meta as any).env?.VITE_API_URL;
    if (envApiUrl && (envApiUrl.startsWith('http://') || envApiUrl.startsWith('https://'))) {
      const wsProto = envApiUrl.startsWith('https:') ? 'wss:' : 'ws:';
      const parsed = new URL(envApiUrl);
      return `${wsProto}//${parsed.host}/ws/live`;
    }
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const host = window.location.hostname === 'localhost' ? 'localhost:8000' : window.location.host;
    return `${protocol}//${host}/ws/live`;
  };

  const connect = () => {
    const baseUrl = computeWsUrl();
    const token = localStorage.getItem('fraudshield_token');
    const wsUrl = token ? `${baseUrl}?token=${encodeURIComponent(token)}` : baseUrl;

    try {
      if (reconnectAttemptsRef.current > 0) {
        setStatus('RECONNECTING');
      }

      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.onopen = () => {
        setStatus('CONNECTED');
        reconnectAttemptsRef.current = 0;
      };

      ws.onmessage = (event) => {
        try {
          const parsed: WebSocketEvent = JSON.parse(event.data);
          
          if (parsed.event_type === 'transaction.created') {
            setLatestTransaction(parsed.payload);
          } else if (parsed.event_type === 'alert.created') {
            setLatestAlert(parsed.payload);
            setLiveAlerts((prev) => [parsed.payload, ...prev.slice(0, 19)]);
          }

          // Trigger listeners
          const eventListeners = listenersRef.current.get(parsed.event_type);
          if (eventListeners) {
            eventListeners.forEach((cb) => cb(parsed.payload));
          }
        } catch (e) {
          // not JSON
        }
      };

      ws.onerror = () => {
        if (reconnectAttemptsRef.current < maxReconnectAttempts) {
          setStatus('RECONNECTING');
        } else {
          setStatus('DISCONNECTED');
        }
      };

      ws.onclose = (event) => {
        if (event.code === 1000 || event.code === 1008) {
          setStatus('DISCONNECTED');
          return;
        }

        if (reconnectAttemptsRef.current < maxReconnectAttempts) {
          setStatus('RECONNECTING');
          reconnectAttemptsRef.current += 1;
          const delay = Math.min(10000, 1500 * Math.pow(1.5, reconnectAttemptsRef.current));
          reconnectTimeoutRef.current = setTimeout(connect, delay);
        } else {
          setStatus('DISCONNECTED');
        }
      };
    } catch (err) {
      if (reconnectAttemptsRef.current < maxReconnectAttempts) {
        setStatus('RECONNECTING');
        reconnectAttemptsRef.current += 1;
        reconnectTimeoutRef.current = setTimeout(connect, 3000);
      } else {
        setStatus('DISCONNECTED');
      }
    }
  };

  useEffect(() => {
    connect();

    // Heartbeat ping interval
    const pingInterval = setInterval(() => {
      if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
        wsRef.current.send('ping');
      }
    }, 15000);

    return () => {
      clearInterval(pingInterval);
      if (reconnectTimeoutRef.current) clearTimeout(reconnectTimeoutRef.current);
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, []);

  const subscribe = (eventType: string, callback: (payload: any) => void) => {
    if (!listenersRef.current.has(eventType)) {
      listenersRef.current.set(eventType, new Set());
    }
    listenersRef.current.get(eventType)!.add(callback);

    return () => {
      const set = listenersRef.current.get(eventType);
      if (set) {
        set.delete(callback);
      }
    };
  };

  const clearAlerts = () => {
    setLiveAlerts([]);
  };

  return (
    <WebSocketContext.Provider
      value={{
        status,
        latestTransaction,
        latestAlert,
        liveAlerts,
        subscribe,
        clearAlerts,
      }}
    >
      {children}
    </WebSocketContext.Provider>
  );
};

export const useWebSocket = () => {
  const context = useContext(WebSocketContext);
  if (!context) {
    throw new Error('useWebSocket must be used within a WebSocketProvider');
  }
  return context;
};
