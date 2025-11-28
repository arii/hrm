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
  ServerMessage,
} from '../types/websocket.js'
import { broadcast, initBroadcaster } from './broadcast.js'
import { verifyToken } from '../lib/token.js'
import { IncomingMessage } from 'http'
import { JWT } from 'next-auth/jwt'

// Define service instances to be managed
let tabataServiceInstance: TabataTimer
let spotifyServiceInstance: SpotifyPolling

const clientData = new Map<string, HrmData>()

interface Services {
  tabataService: TabataTimer
  spotifyService: SpotifyPolling
}

interface AuthenticatedWebSocket extends WebSocket {
  session?: JWT
}

/**
 * Initializes the WebSocket Server manager and registers the core services.
 */
const initSocketManager = (wss: WebSocketServer, services: Services) => {
  initBroadcaster(wss)
  tabataServiceInstance = services.tabataService
  spotifyServiceInstance = services.spotifyService

  wss.on(
    'connection',
    async (ws: AuthenticatedWebSocket, req: IncomingMessage) => {
      try {
        const url = new URL(req.url || '', `ws://${req.headers.host}`)
        const token = url.searchParams.get('token')
        const session = await verifyToken(token)
        if (!session) {
          throw new Error('Invalid session')
        }
        ws.session = session
        console.log(`WebSocket Client authenticated: ${session.sub}`)
      } catch (error) {
        console.error(
          'WebSocket Authentication Error:',
          (error as Error).message
        )
        ws.close(1008, 'Unauthorized')
        return
      }

      if (!ws.session) {
        ws.close(1008, 'Unauthorized')
        return
      }

      const clientId = ws.session.sub as string
      console.log(`WebSocket Client connected: ${clientId}`)

      // Initialize with minimal placeholder; omit name so UI can suppress until real data arrives
      const newClient: HrmData = {
        clientId,
        value: 0,
        maxHr: 185,
        name: ws.session.name || 'Anonymous',
        age: 30,
      }
      clientData.set(clientId, newClient)

    // Send initial state upon connection
    const initialStateMessage: ServerMessage = {
      type: 'INITIAL_STATE',
      payload: {
        hrmData: Array.from(clientData.values()),
        timerData: tabataServiceInstance.getState(),
        spotifyData: spotifyServiceInstance.getState(),
      },
    }
    ws.send(JSON.stringify(initialStateMessage))

    ws.on('message', (message) => {
      handleIncomingMessage(ws, message.toString(), clientId)
    })

    ws.on('close', () => {
      console.log(`WebSocket Client disconnected: ${clientId}`)
      clientData.delete(clientId)
      broadcast({
        type: 'HRM_UPDATE',
        payload: Array.from(clientData.values()),
      })
    })
  })
}

/**
 * Handles incoming JSON messages from client applications.
 */
const handleIncomingMessage = (
  _ws: WebSocket,
  messageString: string,
  clientId: string
) => {
  console.log(
    `[socketManager] INCOMING MESSAGE from ${clientId}:`,
    messageString
  )
  try {
    // Parse and validate message type for type-safe routing
    const parsedJson = JSON.parse(messageString)
    console.log(`[socketManager] PARSED JSON:`, parsedJson)

    const message = ClientCommandMessageSchema.parse(parsedJson) // Use Zod for parsing and validation

    console.log(
      `[socketManager] Received message from ${clientId}:`,
      message.type
    )

    switch (message.type) {
      case 'HRM_INPUT': {
        const existingData = clientData.get(clientId)
        console.log(
          `[socketManager] HRM_INPUT - clientId: ${clientId}, existingData:`,
          existingData,
          'newValue:',
          message.data.value
        )
        if (existingData) {
          // Filter out null values to avoid overwriting valid data
          const updateData = Object.fromEntries(
            Object.entries(message.data).filter(([_, value]) => value !== null)
          )
          clientData.set(clientId, {
            ...existingData,
            ...updateData,
          })
          console.log(
            `[socketManager] HRM_INPUT - Updated clientData for ${clientId}:`,
            clientData.get(clientId)
          )
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
        if (spotifyServiceInstance) {
          // message.command is already typed as SpotifyCommand, which now includes deviceId, volume, and playlistUri
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
