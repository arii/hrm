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
let tabataService: TabataTimer
let spotifyService: SpotifyPolling
// New: Define a function to get the state snapshot
let getUnifiedStateSnapshot: () => StateSnapshot

const hrmClients = new Map<string, HrmData>()

interface Services {
  tabataService: TabataTimer
  spotifyService: SpotifyPolling
}

/**
 * Initializes the WebSocket manager, sets up connection listeners, and registers services.
 * @param wss The WebSocket server instance.
 * @param services An object containing the core application services (TabataTimer, SpotifyPolling).
 * @param getSnapshot A function that returns a complete snapshot of the current application state.
 */
const initSocketManager = (
  wss: WebSocketServer,
  services: Services,
  getSnapshot: () => StateSnapshot
) => {
  initBroadcaster(wss)
  tabataService = services.tabataService
  spotifyService = services.spotifyService
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
 * Parses, validates, and routes incoming messages from a WebSocket client.
 * @param ws The WebSocket instance for the client that sent the message.
 * @param jsonMessage The raw JSON message string received from the client.
 * @param clientId The unique identifier for the connected client.
 */
const handleIncomingMessage = (
  ws: WebSocket,
  jsonMessage: string,
  clientId: string
) => {
  logger.info({ clientId, jsonMessage }, 'Incoming WebSocket message')
  try {
    // Parse and validate message type for type-safe routing
    const parsedMessage = JSON.parse(jsonMessage)
    const message = ClientCommandMessageSchema.parse(parsedMessage) // Use Zod for parsing and validation

    logger.info({ clientId, type: message.type }, 'Received message')

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
        logger.info(
          {
            clientId,
            existingData: existingClientData,
            newValue: message.data.value,
          },
          'HRM_INPUT received'
        )
        if (existingClientData) {
          // Filter out null values to avoid overwriting valid data
          const updatedClientProperties = Object.fromEntries(
            Object.entries(message.data).filter(([_, value]) => value !== null)
          )
          hrmClients.set(clientId, {
            ...existingClientData,
            ...updatedClientProperties,
          })
          logger.info(
            { clientId, updatedData: hrmClients.get(clientId) },
            'HRM_INPUT - Updated clientData'
          )
        }
        broadcast({
          type: 'HRM_UPDATE',
          payload: Array.from(hrmClients.values()),
        })
        break
      }

      case 'TIMER_COMMAND': {
        if (tabataService) {
          tabataService.handleCommand(message.command)
        }
        break
      }

      case 'SET_MODE': {
        if (tabataService) {
          tabataService.setMode(message.mode)
        }
        break
      }

      case 'TIMER_CONFIG': {
        if (tabataService) {
          tabataService.setConfig({
            workDuration: message.workDuration,
            restDuration: message.restDuration,
          })
        }
        break
      }

      case 'SPOTIFY_COMMAND': {
        if (spotifyService) {
          // message.command is already typed as Spotify_COMMAND, which now includes deviceId, volume, and playlistUri
          spotifyService.handleCommand(
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
          { type: (message as { type: unknown }).type },
          'Unknown message type received'
        )
    }
  } catch (e) {
    logger.error({ err: e }, 'Error processing incoming message')
    // Add more specific error handling for Zod validation errors
    if (e instanceof z.ZodError) {
      logger.error({ errors: e.issues }, 'WebSocket message validation failed')
    }
  }
}

export { initSocketManager }
