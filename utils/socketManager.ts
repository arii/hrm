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
  HrmData,
  InitialStateSnapshotPayload,
  ServerMessage,
  StateSnapshot,
} from '../types/websocket.js'
import { broadcast, initBroadcaster } from './broadcast.js'
import logger from './logger.js'

// Define service instances to be managed
let tabataServiceInstance: TabataTimer
let spotifyServiceInstance: SpotifyPolling
// New: Define a function to get the state snapshot
let getUnifiedStateSnapshot: () => StateSnapshot

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
  tabataServiceInstance = services.tabataService
  spotifyServiceInstance = services.spotifyService
  getUnifiedStateSnapshot = getSnapshot

  wss.on('connection', (ws: WebSocket) => {
    const clientId = `user-${Math.random().toString(36).substring(2, 9)}`
    logger.info({ clientId }, 'WebSocket client connected')

    // Initialize with minimal placeholder; omit name so UI can suppress until real data arrives
    const defaultClientData: HrmData = {
      clientId,
      value: 0,
      maxHr: 185,
      // name intentionally undefined until first HRM_INPUT provides one
      age: 30,
    }
    hrmClients.set(clientId, defaultClientData)

    ws.on('message', (message) => {
      handleIncomingMessage(ws, message.toString(), clientId)
    })

    ws.on('close', () => {
      logger.info({ clientId }, 'WebSocket client disconnected')
      hrmClients.delete(clientId)
      broadcast({
        type: 'HRM_UPDATE',
        payload: Array.from(hrmClients.values()),
      })
    })
  })
}

/**
 * Handles incoming JSON messages from client applications.
 */
const handleIncomingMessage = (
  ws: WebSocket,
  jsonMessage: string,
  clientId: string
) => {
  try {
    const parsedMessage = JSON.parse(jsonMessage)
    const message = ClientCommandMessageSchema.parse(parsedMessage)

    logger.info({ clientId, messageType: message.type, messageData: message }, 'Processing WebSocket message')


    switch (message.type) {
      case 'GET_STATE': {
        // The client is requesting the full current state.
        const stateSnapshot = getUnifiedStateSnapshot()

        // Explicitly construct the payload to match the ServerMessage['payload'] type for 'INITIAL_STATE'
        const payload: InitialStateSnapshotPayload = {
          ...stateSnapshot,
          hrmData: Array.from(hrmClients.values()),
        };

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
          // Filter out null values to avoid overwriting valid data
          const updatedClientProperties = Object.fromEntries(
            Object.entries(message.data).filter(([_, value]) => value !== null)
          )
          hrmClients.set(clientId, {
            ...existingClientData,
            ...updatedClientProperties,
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
        if (spotifyServiceInstance) {
          // message.command is already typed as Spotify_COMMAND, which now includes deviceId, volume, and playlistUri
          spotifyServiceInstance.handleCommand(
            message.command,
            message.deviceId,
            message.volume,
            message.playlistUri
          )
        }
        break
      }

      default:
        // This case should ideally not be reached if ClientCommandMessageSchema is exhaustive
        logger.warn(
          { clientId, messageType: (message as { type: unknown }).type },
          'Unknown message type received'
        )
    }
  } catch (e) {
    logger.error({ error: e, clientId, rawMessage: jsonMessage }, 'Error processing incoming message')
    // Add more specific error handling for Zod validation errors
    if (e instanceof z.ZodError) {
      logger.error({ error: e.issues, clientId }, 'WebSocket message validation failed')
    }
  }
}

export { initSocketManager }
