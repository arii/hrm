// hooks/useConnection.ts
import { useCallback, useEffect, useRef, useState } from 'react';
import { getWebSocketURL } from '../utils/urls';
import { ClientCommandMessage, ServerMessage } from '../types/websocket';

interface ConnectionManager {
  connectionStatus: string;
  sendData: (data: ClientCommandMessage) => void;
  connect: () => void;
  disconnect: () => void;
}

export const useConnection = (
  onMessage: (message: ServerMessage) => void,
  serverUrl?: string
): ConnectionManager => {
  const wsUrl = serverUrl || getWebSocketURL();
  const [connectionStatus, setConnectionStatus] = useState('Connecting...');
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const pendingActions = useRef<ClientCommandMessage[]>([]);
  const wsRef = useRef<WebSocket | null>(null);
  const shouldReconnect = useRef(true);

  const connect = useCallback(() => {
    if (typeof window === 'undefined' || wsRef.current?.readyState === WebSocket.OPEN) {
      return;
    }

    shouldReconnect.current = true;
    const ws = new WebSocket(wsUrl);
    wsRef.current = ws;

    ws.onopen = () => {
      console.log('[useConnection] Connected to server');
      setConnectionStatus('Connected');

      if (typeof window !== 'undefined') {
        window.__TEST_WEBSOCKET_READY__ = true;
      }

      ws.send(JSON.stringify({ type: 'GET_STATE' }));

      if (pendingActions.current.length > 0) {
        pendingActions.current.forEach((action) => {
          ws.send(JSON.stringify(action));
        });
        pendingActions.current = [];
      }

      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
        reconnectTimeoutRef.current = null;
      }
    };

    ws.onclose = (event) => {
      console.log(
        '[useConnection] Disconnected from server',
        event.code,
        event.reason
      );
      setConnectionStatus('Disconnected');

      if (typeof window !== 'undefined') {
        window.__TEST_WEBSOCKET_READY__ = false;
      }

      if (shouldReconnect.current && !reconnectTimeoutRef.current) {
        reconnectTimeoutRef.current = setTimeout(() => {
          console.log('[useConnection] Attempting to reconnect...');
          setConnectionStatus('Reconnecting...');
          connect();
        }, 3000);
      }
    };

    ws.onerror = (_err) => {
      console.warn('[useConnection] Connection error');
      setConnectionStatus('Error');
    };

    ws.onmessage = (event) => {
      try {
        const message: ServerMessage = JSON.parse(event.data);
        onMessage(message);
      } catch (e) {
        console.error('Failed to parse WebSocket message:', e);
      }
    };
  }, [wsUrl, onMessage]);

  const disconnect = useCallback(() => {
    shouldReconnect.current = false;
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }
    if (wsRef.current) {
      wsRef.current.close();
    }
    console.log('[useConnection] Manually disconnected.');
  }, []);

  useEffect(() => {
    connect();

    return () => {
      disconnect();
    };
  }, [connect, disconnect]);

  const sendData = useCallback((data: ClientCommandMessage) => {
    const ws = wsRef.current;
    if (ws && ws.readyState === WebSocket.OPEN) {
      const jsonStr = JSON.stringify(data);
      console.log('[useConnection] Sending:', data);
      ws.send(jsonStr);
    } else {
      console.warn(
        '[useConnection] WebSocket not open, queueing action. State:',
        ws?.readyState,
        'Data:',
        data
      );
      pendingActions.current.push(data);
    }
  }, []);

  return {
    connectionStatus,
    sendData,
    connect,
    disconnect,
  };
};
