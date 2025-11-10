// File: hooks/useWebSocket.ts (Central WebSocket Client Hook - Typed)
/**
 * Central client-side hook for managing WebSocket connection and application state.
 * It establishes the connection and updates the unified state based on server broadcasts.
 */
import { useCallback, useEffect, useRef, useState } from "react";
import {
  ClientCommandMessage,
  HrmData,
  SpotifyData,
  TimerData,
  UnifiedStateMessage,
} from "../types/websocket";

// Use explicit 127.0.0.1 for consistency with the server binding
const DEFAULT_SERVER_URL = "ws://127.0.0.1:3000/ws";

interface AppState {
  hrmData: HrmData[];
  timerData: TimerData;
  spotifyData: SpotifyData;
  spotifyServiceInitialized?: boolean;
}

// Initial state, conforming to the interfaces
const INITIAL_STATE: AppState = {
  hrmData: [],
  timerData: {
    isRunning: false,
    currentPhase: "IDLE",
    timeRemaining: 0,
    timeElapsed: 0,
    cycle: 0,
    totalCycles: 8,
    mode: "TABATA",
    workDuration: 30,
    restDuration: 10,
    soundEventId: 0,
  },
  spotifyData: { trackName: "Awaiting Login...", artist: "", isPlaying: false },
  spotifyServiceInitialized: true,
};

const useWebSocket = (serverUrl = DEFAULT_SERVER_URL) => {
  const [connectionStatus, setConnectionStatus] = useState("Connecting...");

  // Unified State Object
  const [appState, setAppState] = useState<AppState>(INITIAL_STATE);

  const wsRef = useRef<WebSocket | null>(null);

  useEffect(() => {
    // Ensure this runs only client-side
    if (typeof window === "undefined") return;

    const ws = new WebSocket(serverUrl);
    wsRef.current = ws;

    ws.onopen = () => setConnectionStatus("Connected");
    ws.onclose = () => setConnectionStatus("Disconnected");
    ws.onerror = (err) => {
      console.error("WebSocket error:", err);
      setConnectionStatus("Error");
    };

    ws.onmessage = (event) => {
      try {
        // Assert incoming message is the UnifiedStateMessage type
        const message: UnifiedStateMessage = JSON.parse(event.data);

        if (message.type === "STATE_UPDATE") {
          console.log(
            "[useWebSocket] Received STATE_UPDATE. HRM Data:",
            message.hrmData
          );
          // Merge the incoming state with the current state to preserve non-updated fields
          setAppState((prev) => ({
            hrmData: message.hrmData || prev.hrmData,
            timerData: message.timerData || prev.timerData,
            spotifyData: message.spotifyData || prev.spotifyData,
            spotifyServiceInitialized:
              message.spotifyServiceInitialized ??
              prev.spotifyServiceInitialized,
          }));
        }
      } catch (e) {
        console.error("Failed to parse WebSocket message:", e);
      }
    };
    return () => {
      // Clean up the connection on unmount
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, [serverUrl]);

  /**
   * Sends a JSON payload (ClientCommandMessage) to the WebSocket server.
   * Note: The hook takes the typed object and stringifies it internally.
   */
  const sendData = useCallback((data: ClientCommandMessage) => {
    const ws = wsRef.current;
    if (ws && ws.readyState === WebSocket.OPEN) {
      const jsonStr = JSON.stringify(data);
      console.log("[useWebSocket] Sending:", data);
      ws.send(jsonStr);
    } else {
      console.warn(
        "[useWebSocket] WebSocket not open. State:",
        ws?.readyState,
        "Data:",
        data
      );
    }
  }, []);

  return {
    ...appState, // Expose all state parts directly
    connectionStatus,
    sendData,
  };
};

export default useWebSocket;
