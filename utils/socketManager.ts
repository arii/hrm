// File: utils/socketManager.ts (WebSocket Manager - Typed)
/**
 * WebSocket Manager (Typed): Handles client connections, routes commands, and broadcasts state.
 */
import { WebSocket, Server as WebSocketServer } from 'ws'
import { z } from 'zod' // Import z from zod
import { SpotifyPolling } from '../services/spotifyPolling.js'
import TabataTimer from '../services/tabataTimer.js'
import logger from '@/utils/logger'
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

const hrmClients = new Map<string, HrmData>()

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
    logger.info('WebSocket client connected', { clientId })

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
      logger.info('WebSocket client disconnected', { clientId })
      hrmClients.delete(clientId)
      broadcast({
        type: 'HRM_UPDATE',
        payload: Array.from(hrmClients.values()),
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
        logger.warn('Terminating stale WebSocket connection', {
          reason: 'no pong received',
          clientId: extWs.clientId,
        })
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
  logger.debug('Incoming WebSocket message', { clientId, message: jsonMessage })
  try {
    // Parse and validate message type for type-safe routing
    const parsedMessage = JSON.parse(jsonMessage)
    const message = ClientCommandMessageSchema.parse(parsedMessage) // Use Zod for parsing and validation

    logger.debug('Validated WebSocket message', {
      clientId,
      type: message.type,
    })

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
        logger.info('Client registered role', {
          clientId,
          role: ws.clientType,
        })
        break
      }

      case 'GET_STATE': {
        // The client is requesting the full current state.
        const stateSnapshot = getUnifiedStateSnapshot()

        // Explicitly construct the payload to match the ServerMessage['payload'] type for 'INITIAL_STATE'
        const payload: InitialStateSnapshotPayload = {
          ...stateSnapshot,
          hrmData: Array.from(hrmClients.values()),
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
        logger.debug('Processing HRM_INPUT', {
          clientId,
          existingData: existingClientData,
          newValue: message.data.value,
        })
        if (existingClientData) {
          // Filter out null values to avoid overwriting valid data
          const updatedClientProperties = Object.fromEntries(
            Object.entries(message.data).filter(([_, value]) => value !== null)
          )
          hrmClients.set(clientId, {
            ...existingClientData,
            ...updatedClientProperties,
          })
          logger.debug('Updated HRM client data', {
            clientId,
            newData: hrmClients.get(clientId),
          })
        }
        broadcast({
          type: 'HRM_UPDATE',
          payload: Array.from(hrmClients.values()),
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
        logger.info('Relaying Spotify command', {
          command: commandMsg.command,
          deviceId: commandMsg.deviceId,
        })

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
        logger.warn('Unknown message type received', {
          type: (message as { type: unknown }).type,
        })
    }
  } catch (e) {
    logger.error('Error processing incoming message', {
      error: e instanceof Error ? e.message : e,
    })
    // Add more specific error handling for Zod validation errors
    if (e instanceof z.ZodError) {
      logger.error('WebSocket message validation failed', { errors: e.issues })
    }
  }
}

export { initSocketManager }
