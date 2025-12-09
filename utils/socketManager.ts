// File: utils/socketManager.ts (WebSocket Manager - Typed)
/**
 * WebSocket Manager (Typed): Handles client connections, routes commands, and broadcasts state.
 */
import { WebSocket, Server as WebSocketServer } from 'ws'
import { z } from 'zod' // Import z from zod
import { SpotifyPolling } from '../services/spotifyPolling.js'
import TabataTimer from '../services/tabataTimer.js'
import {
  ClientCommandMessageSchema,
  ClientRegistrationMessage,
  SpotifyCommandMessage,
  HrmData,
  HrmMetric,
  InitialStateSnapshotPayload,
  ServerMessage,
  StateSnapshot,
} from '../types/websocket.js'
import { broadcast, initBroadcaster } from './broadcast.js'

// Extend WebSocket to track client role
interface ExtWebSocket extends WebSocket {
  isAlive?: boolean
  clientType?: 'dashboard' | 'controller'
}

// Define service instances to be managed
let tabataServiceInstance: TabataTimer
let spotifyServiceInstance: SpotifyPolling
// New: Define a function to get the state snapshot
let getUnifiedStateSnapshot: () => StateSnapshot

const hrmClients = new Map<string, HrmData>()

// Helper function to map internal state to the new lightweight metric format
const mapToHrmMetrics = (clients: Map<string, HrmData>): HrmMetric[] => {
  return Array.from(clients.values()).map((client) => {
    // A null value indicates a disconnected sensor or signal drop
    const isConnected =
      client.value !== null && typeof client.value !== 'undefined'
    const currentValue = isConnected && client.value ? client.value : 0
    const percentMax =
      client.maxHr > 0 ? (currentValue / client.maxHr) * 100 : 0

    return {
      clientId: client.clientId,
      value: currentValue,
      percentMax: Math.round(percentMax), // Keep it as a whole number
      connected: isConnected,
    }
  })
}

interface Services {
  tabataService: TabataTimer
  spotifyService: SpotifyPolling
}

/**
 * Initializes the WebSocket Server manager and registers the core services.
 */
const initSocketManager = (
  wss: WebSocketServer,
  services: Services,
  getSnapshot: () => StateSnapshot
) => {
  initBroadcaster(wss)
  tabataServiceInstance = services.tabataService
  spotifyServiceInstance = services.spotifyService
  getUnifiedStateSnapshot = getSnapshot

  wss.on('connection', (ws: WebSocket) => {
    const extWs = ws as ExtWebSocket
    const clientId = `user-${Math.random().toString(36).substring(2, 9)}`
    extWs.isAlive = true
    console.log(`WebSocket Client connected: ${clientId}`)

    // Heartbeat
    extWs.on('pong', () => {
      extWs.isAlive = true
    })

    // Initialize with minimal placeholder; omit name so UI can suppress until real data arrives
    const defaultClientData: HrmData = {
      clientId,
      value: 0,
      maxHr: 185,
      // name intentionally undefined until first HRM_INPUT provides one
      age: 30,
    }
    hrmClients.set(clientId, defaultClientData)

    extWs.on('message', (message) => {
      handleIncomingMessage(extWs, message.toString(), clientId)
    })

    extWs.on('close', () => {
      console.log(`WebSocket Client disconnected: ${clientId}`)
      hrmClients.delete(clientId)
      broadcast({
        type: 'HRM_UPDATE',
        payload: mapToHrmMetrics(hrmClients),
      })
    })
  })

  // Keep-alive pinger (runs every 30s)
  const interval = setInterval(() => {
    wss.clients.forEach((ws) => {
      const extWs = ws as ExtWebSocket
      if (extWs.isAlive === false) return ws.terminate()
      extWs.isAlive = false
      ws.ping()
    })
  }, 30000)

  wss.on('close', () => clearInterval(interval))
}

/**
 * Handles incoming JSON messages from client applications.
 */
const handleIncomingMessage = (
  ws: ExtWebSocket,
  jsonMessage: string,
  clientId: string
) => {
  console.log(`[socketManager] INCOMING MESSAGE from ${clientId}:`, jsonMessage)
  try {
    // Parse and validate message type for type-safe routing
    const parsedMessage = JSON.parse(jsonMessage)
    console.log(`[socketManager] PARSED JSON:`, parsedMessage)

    const message = ClientCommandMessageSchema.parse(parsedMessage) // Use Zod for parsing and validation

    console.log(
      `[socketManager] Received message from ${clientId}:`,
      message.type
    )

    switch (message.type) {
      case 'REGISTER_CLIENT': {
        // Role Registration - Dashboard identifies itself as the executor
        ws.clientType = (message as ClientRegistrationMessage).role
        console.log(`[WS] Client registered as: ${ws.clientType}`)
        break
      }

      case 'GET_STATE': {
        // The client is requesting the full current state.
        const stateSnapshot = getUnifiedStateSnapshot()

        // Construct the new payload with lightweight metrics
        const payload: InitialStateSnapshotPayload = {
          ...stateSnapshot,
          hrmMetrics: mapToHrmMetrics(hrmClients),
        }

        const initialStateMessage: ServerMessage = {
          type: 'INITIAL_STATE',
          payload: payload,
        }
        ws.send(JSON.stringify(initialStateMessage))
        break
      }

      case 'HRM_INPUT': {
        const existingClientData = hrmClients.get(clientId)
        if (existingClientData) {
          // Create a new object with updated properties, allowing null to be set for 'value'
          const updatedData = { ...existingClientData, ...message.data }
          hrmClients.set(clientId, updatedData)
        }
        // Broadcast the lightweight metric payload
        broadcast({
          type: 'HRM_UPDATE',
          payload: mapToHrmMetrics(hrmClients),
        })
        break
      }

      case 'TIMER_COMMAND': {
        if (tabataServiceInstance) {
          tabataServiceInstance.handleCommand(message.command)
        }
        break
      }

      case 'SET_MODE': {
        if (tabataServiceInstance) {
          tabataServiceInstance.setMode(message.mode)
        }
        break
      }

      case 'TIMER_CONFIG': {
        if (tabataServiceInstance) {
          tabataServiceInstance.setConfig({
            workDuration: message.workDuration,
            restDuration: message.restDuration,
          })
        }
        break
      }

      case 'SPOTIFY_COMMAND': {
        const commandMsg = message as SpotifyCommandMessage
        console.log(`[WS] Handling command: ${commandMsg.command}`)

        if (spotifyServiceInstance) {
          spotifyServiceInstance.handleCommand(
            commandMsg.command,
            commandMsg.deviceId,
            commandMsg.volume,
            commandMsg.playlistUri
          )
        }
        break
      }

      default:
        // This case should ideally not be reached if ClientCommandMessageSchema is exhaustive
        console.warn(
          'Unknown message type received:',
          (message as { type: unknown }).type
        )
    }
  } catch (e) {
    console.error('Error processing incoming message:', e)
    // Add more specific error handling for Zod validation errors
    if (e instanceof z.ZodError) {
      console.error('WebSocket message validation failed:', e.issues)
    }
  }
}

export { initSocketManager }
