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
  UnifiedStateMessage,
} from '../types/websocket.js'

// Define service instances to be managed
let wssInstance: WebSocketServer
let tabataServiceInstance: TabataTimer
let spotifyServiceInstance: SpotifyPolling

const clientData = new Map<string, HrmData>()

interface Services {
  tabataService: TabataTimer
  spotifyService: SpotifyPolling
}

/**
 * Initializes the WebSocket Server manager and registers the core services.
 */
const initSocketManager = (wss: WebSocketServer, services: Services) => {
  wssInstance = wss
  tabataServiceInstance = services.tabataService
  spotifyServiceInstance = services.spotifyService

  wssInstance.on('connection', (ws: WebSocket) => {
    const clientId = `user-${Math.random().toString(36).substring(2, 9)}`
    console.log(`WebSocket Client connected: ${clientId}`)

    // Initialize with minimal placeholder; omit name so UI can suppress until real data arrives
    const newClient: HrmData = {
      clientId,
      value: 0,
      maxHr: 185,
      // name intentionally undefined until first HRM_INPUT provides one
      age: 30,
    }
    clientData.set(clientId, newClient)

    // Send initial state upon connection
    ws.send(
      JSON.stringify({
        type: 'STATE_UPDATE',
        hrmData: Array.from(clientData.values()),
        timerData: tabataServiceInstance.getState(),
        spotifyData: spotifyServiceInstance.getState(),
      } as UnifiedStateMessage)
    )

    ws.on('message', (message) => {
      handleIncomingMessage(ws, message.toString(), clientId)
    })

    ws.on('close', () => {
      console.log(`WebSocket Client disconnected: ${clientId}`)
      clientData.delete(clientId)
      broadcastState()
    })
  })
}

const broadcastState = () => {
  const message: UnifiedStateMessage = {
    type: 'STATE_UPDATE',
    hrmData: Array.from(clientData.values()),
    timerData: tabataServiceInstance.getState(),
    spotifyData: spotifyServiceInstance.getState(),
  }
  console.log(
    `[broadcastState] Broadcasting to ${wssInstance.clients.size} clients. HRM Data:`,
    message.hrmData
  )
  wssInstance.clients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(JSON.stringify(message))
    }
  })
}

/**
 * Handles incoming JSON messages from client applications.
 */
const handleIncomingMessage = (
  ws: WebSocket,
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
        // No need for manual check if message.data and typeof message.data.value === "number"
        // as Zod schema already validates it.
        const existingData = clientData.get(clientId)
        console.log(
          `[socketManager] HRM_INPUT - clientId: ${clientId}, existingData:`,
          existingData,
          'newValue:',
          message.data.value
        )
        if (existingData) {
          const updatedClient: HrmData = {
            ...existingData,
            ...message.data,
            value:
              message.data.value !== null && message.data.value !== undefined
                ? message.data.value
                : existingData.value,
          }
          clientData.set(clientId, updatedClient)
          console.log(
            `[socketManager] HRM_INPUT - Updated clientData for ${clientId}:`,
            clientData.get(clientId)
          )
        }
        broadcastState()
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
            totalCycles: message.totalCycles,
          })
        }
        break
      }

      case 'SPOTIFY_COMMAND': {
        if (spotifyServiceInstance) {
          // message.command is already typed as SpotifyCommand, which now includes deviceId and volume
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
