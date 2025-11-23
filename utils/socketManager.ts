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
  TimerData,
  SpotifyData,
  ServerBroadcastMessage,
} from '../types/websocket.js'

// Define service instances to be managed
let wssInstance: WebSocketServer
let tabataServiceInstance: TabataTimer
let spotifyServiceInstance: SpotifyPolling

// In-memory store for HRM client data
const clientData = new Map<string, HrmData>()

interface Services {
  tabataService: TabataTimer
  spotifyService: SpotifyPolling
}

// --- Broadcasting Functions ---

/**
 * Broadcasts a message to all connected and ready clients.
 * @param message The `ServerBroadcastMessage` to send.
 */
const broadcast = (message: ServerBroadcastMessage) => {
  if (!wssInstance) return
  const serializedMessage = JSON.stringify(message)
  wssInstance.clients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(serializedMessage)
    }
  })
}

const broadcastHrmUpdate = () => {
  console.log(
    `[broadcastHrmUpdate] Broadcasting to ${
      wssInstance.clients.size
    } clients. HRM Data points: ${clientData.size}`
  )
  broadcast({
    type: 'HRM_UPDATE',
    payload: Array.from(clientData.values()),
  })
}

const broadcastTimerUpdate = (timerData: TimerData) => {
  broadcast({
    type: 'TIMER_UPDATE',
    payload: timerData,
  })
}

const broadcastSpotifyUpdate = (spotifyData: SpotifyData) => {
  broadcast({
    type: 'SPOTIFY_UPDATE',
    payload: spotifyData,
  })
}

/**
 * Initializes the WebSocket Server manager and registers the core services.
 */
const initSocketManager = (
  wss: WebSocketServer,
  services: Services,
  spotifyServiceInitialized: boolean
) => {
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
      age: 30,
    }
    clientData.set(clientId, newClient)

    // Send the comprehensive initial state to the newly connected client
    ws.send(
      JSON.stringify({
        type: 'INITIAL_STATE',
        payload: {
          hrmData: Array.from(clientData.values()),
          timerData: tabataServiceInstance.getState(),
          spotifyData: spotifyServiceInstance.getState(),
          spotifyServiceInitialized,
        },
      })
    )

    // Notify all other clients of the new user
    broadcastHrmUpdate()

    ws.on('message', (message) => {
      handleIncomingMessage(ws, message.toString(), clientId)
    })

    ws.on('close', () => {
      console.log(`WebSocket Client disconnected: ${clientId}`)
      clientData.delete(clientId)
      // Notify all clients that a user has left
      broadcastHrmUpdate()
    })
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
    const parsedJson = JSON.parse(messageString)
    const message = ClientCommandMessageSchema.parse(parsedJson)

    switch (message.type) {
      case 'HRM_INPUT': {
        const existingData = clientData.get(clientId)
        if (existingData) {
          const updateData = Object.fromEntries(
            Object.entries(message.data).filter(([_, value]) => value !== null)
          )
          clientData.set(clientId, { ...existingData, ...updateData })
        }
        broadcastHrmUpdate()
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

      case 'SPOTIFY_COMMAND':
        spotifyServiceInstance?.handleCommand(
          message.command,
          message.deviceId,
          message.volume,
          message.playlistUri
        )
        break

      default:
        console.warn(
          'Unknown message type received:',
          (message as { type: unknown }).type
        )
    }
  } catch (e) {
    console.error('Error processing incoming message:', e)
    if (e instanceof z.ZodError) {
      console.error('WebSocket message validation failed:', e.issues)
    }
  }
}

export {
  initSocketManager,
  broadcastHrmUpdate,
  broadcastTimerUpdate,
  broadcastSpotifyUpdate,
}
