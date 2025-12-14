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
  SpotifyExecutionMessage,
  HrmData,
  InitialStateSnapshotPayload,
  ServerMessage,
  StateSnapshot,
} from '../types/websocket.js'
import { broadcast, initBroadcaster } from './broadcast.js'
import { CALORIE_DEFAULTS } from './constants.js'

// Extend WebSocket to track client role and connection health
interface ExtWebSocket extends WebSocket {
  lastPingTime: number // Changed to non-optional
  clientType?: 'dashboard' | 'controller'
}

// Define service instances to be managed
let tabataServiceInstance: TabataTimer
let spotifyServiceInstance: SpotifyPolling
// New: Define a function to get the state snapshot
let getUnifiedStateSnapshot: () => StateSnapshot
// Store WebSocket server reference for command relay
let wsServerInstance: WebSocketServer

const clientData = new Map<string, HrmData>()
// Track internal state for calculations (not sent to client)
const clientSessionState = new Map<string, { lastUpdate: number }>()

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
  wsServerInstance = wss
  tabataServiceInstance = services.tabataService
  spotifyServiceInstance = services.spotifyService
  getUnifiedStateSnapshot = getSnapshot

  wss.on('connection', (ws: WebSocket) => {
    const extWs = ws as ExtWebSocket
    const clientId = `user-${Math.random().toString(36).substring(2, 9)}`
    extWs.lastPingTime = Date.now() // Initialize on connect
    console.log(`WebSocket Client connected: ${clientId}`)

    // Initialize new client
    const newClient: HrmData = {
      clientId,
      value: 0,
      maxHr: 185,
      age: 30,
      calories: 0, // Initialize to 0
    }
    clientData.set(clientId, newClient)
    clientSessionState.set(clientId, { lastUpdate: Date.now() })


    extWs.on('message', (message) => {
      handleIncomingMessage(extWs, message.toString(), clientId)
    })

    extWs.on('close', () => {
      console.log(`WebSocket Client disconnected: ${clientId}`)
      clientData.delete(clientId)
      clientSessionState.delete(clientId)
      broadcast({
        type: 'HRM_UPDATE',
        payload: Array.from(clientData.values()),
      })
    })
  })

  // Server-side watchdog to clean up stale connections.
  const WATCHDOG_INTERVAL = 30000 // 30 seconds
  const CLIENT_INACTIVITY_TIMEOUT = 120000 // 2 minutes

  const interval = setInterval(() => {
    const now = Date.now()
    wss.clients.forEach((ws) => {
      const extWs = ws as ExtWebSocket

      // If the client hasn't responded in time, terminate.
      if (now - extWs.lastPingTime > CLIENT_INACTIVITY_TIMEOUT) {
        console.log(
          `Terminating stale WebSocket connection for client (no pong received).`
        )
        return ws.terminate()
      }
    })
  }, WATCHDOG_INTERVAL)

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
      case 'PING': {
        // Client-side heartbeat
        ws.lastPingTime = Date.now()
        // Respond with a pong
        ws.send(JSON.stringify({ type: 'PONG' }))
        break
      }
      case 'REGISTER_CLIENT': {
        // Role Registration - Dashboard identifies itself as the executor
        ws.clientType = (message as ClientRegistrationMessage).role
        console.log(`[WS] Client registered as: ${ws.clientType}`)
        break
      }

      case 'GET_STATE': {
        // The client is requesting the full current state.
        const stateSnapshot = getUnifiedStateSnapshot()

        // Explicitly construct the payload to match the ServerMessage['payload'] type for 'INITIAL_STATE'
        const payload: InitialStateSnapshotPayload = {
          ...stateSnapshot,
          hrmData: Array.from(clientData.values()),
        }

        const initialStateMessage: ServerMessage = {
          type: 'INITIAL_STATE',
          payload: payload,
        }
        ws.send(JSON.stringify(initialStateMessage))
        break
      }

      case 'HRM_INPUT': {
        const existingData = clientData.get(clientId)
        const sessionState = clientSessionState.get(clientId)

        if (existingData && sessionState) {
          const now = Date.now()
          // Calculate time delta in minutes
          const dtMinutes = (now - sessionState.lastUpdate) / 1000 / 60

          // Update Session State
          sessionState.lastUpdate = now

          // Calculate Calories if HR is active (> 30 bpm to filter noise)
          let newCalories = existingData.calories
          const currentHr = message.data.value ?? existingData.value
          const currentAge = message.data.age ?? existingData.age ?? 30

          if (currentHr > 30 && dtMinutes > 0 && dtMinutes < 5) { // Filter huge jumps
             // Formula: (-55.0969 + 0.6309 x HR + 0.1988 x Weight + 0.2017 x Age) / 4.184
             const rate = (
               -CALORIE_DEFAULTS.INTERCEPT +
               (CALORIE_DEFAULTS.FACTOR_HR * currentHr) +
               (CALORIE_DEFAULTS.FACTOR_WEIGHT * CALORIE_DEFAULTS.WEIGHT_KG) +
               (CALORIE_DEFAULTS.FACTOR_AGE * currentAge)
             ) / CALORIE_DEFAULTS.JOULE_CONVERSION

             // Ensure positive rate
             const safeRate = Math.max(0, rate)
             newCalories += safeRate * dtMinutes
          }

          const updateData = Object.fromEntries(
            Object.entries(message.data).filter(([_, value]) => value !== null)
          )

          clientData.set(clientId, {
            ...existingData,
            ...updateData,
            calories: Math.round(newCalories * 10) / 10, // Round to 1 decimal
          })
        }
        broadcast({
          type: 'HRM_UPDATE',
          payload: Array.from(clientData.values()),
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
        console.log(`[WS Relay] Forwarding command: ${commandMsg.command}`)

        // Broadcast ONLY to connected Dashboards for remote execution
        wsServerInstance.clients.forEach((client: WebSocket) => {
          const target = client as ExtWebSocket
          // Only forward to the Dashboard, not other controllers
          if (
            target.readyState === WebSocket.OPEN &&
            target.clientType === 'dashboard'
          ) {
            const executionMessage: SpotifyExecutionMessage = {
              type: 'EXECUTE_SPOTIFY',
              payload: commandMsg,
            }
            target.send(JSON.stringify(executionMessage))
          }
        })

        // Also handle locally for backward compatibility
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
