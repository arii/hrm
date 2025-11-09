// File: utils/socketManager.ts (WebSocket Manager - Typed)
/**
 * WebSocket Manager (Typed): Handles client connections, routes commands, and broadcasts state.
 */
import { WebSocket, Server as WebSocketServer } from "ws";
import { SpotifyPolling } from "../services/spotifyPolling";
import TabataTimer from "../services/tabataTimer";
import {
  ClientCommandMessage,
  HrmData,
  UnifiedStateMessage,
} from "../types/websocket";

// Define service instances to be managed
let wssInstance: WebSocketServer;
let tabataServiceInstance: TabataTimer;
let spotifyServiceInstance: SpotifyPolling;

const clientData = new Map<string, HrmData>();

interface Services {
  tabataService: TabataTimer;
  spotifyService: SpotifyPolling;
}

/**
 * Initializes the WebSocket Server manager and registers the core services.
 */
export const initSocketManager = (wss: WebSocketServer, services: Services) => {
  wssInstance = wss;
  tabataServiceInstance = services.tabataService;
  spotifyServiceInstance = services.spotifyService;

  wssInstance.on("connection", (ws: WebSocket) => {
    const clientId = `user-${Math.random().toString(36).substring(2, 9)}`;
    console.log(`WebSocket Client connected: ${clientId}`);

    const newClient: HrmData = {
      clientId,
      value: 0,
      maxHr: 185,
      name: "New User",
      age: 30,
    };
    clientData.set(clientId, newClient);

    // Send initial state upon connection
    ws.send(
      JSON.stringify({
        type: "STATE_UPDATE",
        hrmData: Array.from(clientData.values()),
        timerData: tabataServiceInstance.getState(),
        spotifyData: spotifyServiceInstance.getState(),
      } as UnifiedStateMessage)
    );

    ws.on("message", (message) => {
      handleIncomingMessage(ws, message.toString(), clientId);
    });

    ws.on("close", () => {
      console.log(`WebSocket Client disconnected: ${clientId}`);
      clientData.delete(clientId);
      broadcastState();
    });
  });
};

const broadcastState = () => {
  const message: UnifiedStateMessage = {
    type: "STATE_UPDATE",
    hrmData: Array.from(clientData.values()),
    timerData: tabataServiceInstance.getState(),
    spotifyData: spotifyServiceInstance.getState(),
  };
  wssInstance.clients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(JSON.stringify(message));
    }
  });
};

/**
 * Handles incoming JSON messages from client applications.
 */
const handleIncomingMessage = (
  ws: WebSocket,
  messageString: string,
  clientId: string
) => {
  try {
    // Parse and assert message type for type-safe routing
    const message: ClientCommandMessage = JSON.parse(
      messageString
    ) as ClientCommandMessage;

    switch (message.type) {
      case "HRM_INPUT":
        // Check if message structure matches the interface before processing
        if (message.data && typeof message.data.value === "number") {
          const existingData = clientData.get(clientId);
          if (existingData) {
            clientData.set(clientId, {
              ...existingData,
              ...message.data,
            });
          }
          broadcastState();
        }
        break;

      case "TIMER_COMMAND":
        if (tabataServiceInstance) {
          // Extract optional config from message
          const config = {
            workDuration: message.workDuration,
            restDuration: message.restDuration,
            totalCycles: message.totalCycles,
          };
          tabataServiceInstance.handleCommand(message.command, config);
        }
        break;

      case "SPOTIFY_COMMAND":
        if (spotifyServiceInstance) {
          spotifyServiceInstance.handleCommand(message.command);
        }
        break;

      default:
        console.warn("Unknown message type received:", (message as { type: unknown }).type);
    }
  } catch (e) {
    console.error("Error processing incoming message:", e);
  }
};

module.exports = { initSocketManager };
