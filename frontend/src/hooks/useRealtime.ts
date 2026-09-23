/**
 * React Hook for Real-Time WebSocket Event Stream.
 * Section 11 — Real-Time Event System.
 */
import { useEffect, useState, useCallback } from 'react';
import { realtimeService, RealtimeConnectionState, EventEnvelope } from '../services/realtime';

export function useRealtime(topic?: string) {
  const [connectionState, setConnectionState] = useState<RealtimeConnectionState>(realtimeService.getState());

  useEffect(() => {
    // Listen for connection state changes
    const unsubState = realtimeService.onStateChange((state) => {
      setConnectionState(state);
    });

    // Subscribe to topic if provided
    if (topic) {
      realtimeService.subscribe(topic);
    }

    return () => {
      unsubState();
      if (topic) {
        realtimeService.unsubscribe(topic);
      }
    };
  }, [topic]);

  const subscribeEvent = useCallback(<T = any>(eventType: string, handler: (event: EventEnvelope<T>) => void) => {
    return realtimeService.on<T>(eventType, handler);
  }, []);

  return {
    connectionState,
    isConnected: connectionState === 'CONNECTED',
    subscribeEvent,
    subscribeTopic: (t: string) => realtimeService.subscribe(t),
    unsubscribeTopic: (t: string) => realtimeService.unsubscribe(t),
    sendMessage: (msg: Record<string, any>) => realtimeService.send(msg)
  };
}
