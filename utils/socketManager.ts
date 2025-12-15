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
import { CALORIE_DEFAULTS } from './constants.js' // Ensure this import exists
import { broadcast, initBroadcaster } from './broadcast.js'
import logger from './logger.js'

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
    logger.info(`WebSocket Client connected: ${clientId}`)

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
      logger.info(`WebSocket Client disconnected: ${clientId}`)
      clientData.delete(clientId)
      clientSessionState.delete(clientId)
      broadcastState()
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
        logger.warn(
          `Terminating stale WebSocket connection for client (no pong received).`
        )
        return ws.terminate()
      }
    })
  }, WATCHDOG_INTERVAL)

  wss.on('close', () => clearInterval(interval))
}

const broadcastState = () => {
  broadcast({
    type: 'HRM_UPDATE',
    payload: Array.from(clientData.values()),
  })
}

/**
 * Handles incoming JSON messages from client applications.
 */
const handleIncomingMessage = (
  ws: ExtWebSocket,
  messageString: string,
  clientId: string
) => {
  try {
    const parsedJson = JSON.parse(messageString)
    const message = ClientCommandMessageSchema.parse(parsedJson)

    switch (message.type) {
      case 'PING': {
        ws.lastPingTime = Date.now()
        ws.send(JSON.stringify({ type: 'PONG' }))
        break
      }
      case 'REGISTER_CLIENT': {
        ws.clientType = (message as ClientRegistrationMessage).role
        logger.info(`[WS] Client registered as: ${ws.clientType}`)
        break
      }
      case 'GET_STATE': {
        const stateSnapshot = getUnifiedStateSnapshot()
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
          const dtMinutes = (now - sessionState.lastUpdate) / 1000 / 60
          sessionState.lastUpdate = now

          let newCalories = existingData.calories
          const currentHr = message.data.value ?? existingData.value
          const currentAge = message.data.age ?? existingData.age ?? 30

          if (currentHr > 30 && dtMinutes > 0 && dtMinutes < 5) {
            const rate =
              (-CALORIE_DEFAULTS.INTERCEPT +
                CALORIE_DEFAULTS.FACTOR_HR * currentHr +
                CALORIE_DEFAULTS.FACTOR_WEIGHT * CALORIE_DEFAULTS.WEIGHT_KG +
                CALORIE_DEFAULTS.FACTOR_AGE * currentAge) /
              CALORIE_DEFAULTS.JOULE_CONVERSION

            const safeRate = Math.max(0, rate)
            newCalories += safeRate * dtMinutes
          }

          const updateData = Object.fromEntries(
            Object.entries(message.data).filter(([_, value]) => value !== null)
          )

          clientData.set(clientId, {
            ...existingData,
            ...updateData,
            calories: Math.round(newCalories * 10) / 10,
          })
        }
        broadcastState()
        break
      }

      case 'TIMER_COMMAND':
        tabataServiceInstance?.handleCommand(message.command)
        break

      case 'SET_MODE':
        tabataServiceInstance?.setMode(message.mode)
        break

      case 'TIMER_CONFIG':
        tabataServiceInstance?.setConfig({
          workDuration: message.workDuration,
          restDuration: message.restDuration,
        })
        break

      case 'SPOTIFY_COMMAND': {
        const commandMsg = message as SpotifyCommandMessage
        logger.info(`[WS Relay] Forwarding command: ${commandMsg.command}`)

        wsServerInstance.clients.forEach((client: WebSocket) => {
          const target = client as ExtWebSocket
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

        spotifyServiceInstance?.handleCommand(
          commandMsg.command,
          commandMsg.deviceId,
          commandMsg.volume,
          commandMsg.playlistUri
        )
        break
      }
      default:
        logger.warn(
          'Unknown message type received:',
          (message as { type: unknown }).type
        )
    }
  } catch (e) {
    logger.error('Error processing incoming message:', e)
    if (e instanceof z.ZodError) {
      logger.error('WebSocket message validation failed:', e.issues)
    }
  }
}

export { initSocketManager }
