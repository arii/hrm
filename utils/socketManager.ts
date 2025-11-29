// File: utils/socketManager.ts (WebSocket Manager - Typed)
/**
 * WebSocket Manager (Typed): Handles client connections, routes commands, and broadcasts state.
 */
import { IncomingMessage } from 'http'
import { WebSocket, Server as WebSocketServer } from 'ws'
import { z } from 'zod'
import { SpotifyPolling } from '../services/spotifyPolling.js'
import TabataTimer from '../services/tabataTimer.js'
import {
  ClientCommandMessageSchema,
  HrmData,
  ServerMessage,
} from '../types/websocket.js'
import { broadcast, initBroadcaster } from './broadcast.js'

// Define service instances to be managed
let tabataServiceInstance: TabataTimer
let spotifyServiceInstance: SpotifyPolling

const hrmClients = new Map<string, HrmData>()

interface Services {
  tabataService: TabataTimer
  spotifyService: SpotifyPolling
}

/**
 * Initializes the WebSocket Server manager and registers the core services.
 */
const initSocketManager = (wss: WebSocketServer, services: Services) => {
  initBroadcaster(wss)
  tabataServiceInstance = services.tabataService
  spotifyServiceInstance = services.spotifyService

<<<<<<< HEAD
  wss.on('connection', (ws: WebSocket, req: IncomingMessage) => {
    const session = (req as any).session
    if (!session || !session.user) {
      console.error('WebSocket connection without a valid session.')
      ws.close(1008, 'User not authenticated') // 1008: Policy Violation
      return
    }

    const clientId = session.user.id || `user-${Math.random().toString(36).substring(2, 9)}`
||||||| 2286026
  wssInstance.on('connection', (ws: WebSocket) => {
    const clientId = `user-${Math.random().toString(36).substring(2, 9)}`
=======
  wss.on('connection', (ws: WebSocket) => {
    const clientId = `user-${Math.random().toString(36).substring(2, 9)}`
>>>>>>> origin/leader
    console.log(`WebSocket Client connected: ${clientId}`)

<<<<<<< HEAD
    // Initialize with user data from the session
    const newClient: HrmData = {
||||||| 2286026
    // Initialize with minimal placeholder; omit name so UI can suppress until real data arrives
    const newClient: HrmData = {
=======
    // Initialize with minimal placeholder; omit name so UI can suppress until real data arrives
    const defaultClientData: HrmData = {
>>>>>>> origin/leader
      clientId,
      value: 0,
      maxHr: 185,
      // name intentionally undefined until first HRM_INPUT provides one
      age: 30,
    }
    hrmClients.set(clientId, defaultClientData)

    // Send initial state upon connection
<<<<<<< HEAD
    const initialStateMessage: ServerMessage = {
      type: 'INITIAL_STATE',
      payload: {
        hrmData: Array.from(clientData.values()),
||||||| 2286026
    ws.send(
      JSON.stringify({
        type: 'STATE_UPDATE',
        hrmData: Array.from(clientData.values()),
=======
    const initialStateMessage: ServerMessage = {
      type: 'INITIAL_STATE',
      payload: {
        hrmData: Array.from(hrmClients.values()),
>>>>>>> origin/leader
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
<<<<<<< HEAD
      clientData.delete(clientId)
      broadcast({
        type: 'HRM_UPDATE',
        payload: Array.from(clientData.values()),
      })
||||||| 2286026
      clientData.delete(clientId)
      broadcastState()
=======
      hrmClients.delete(clientId)
      broadcast({
        type: 'HRM_UPDATE',
        payload: Array.from(hrmClients.values()),
      })
>>>>>>> origin/leader
    })
  })
}

/**
 * Handles incoming JSON messages from client applications.
 */
const handleIncomingMessage = (
  _ws: WebSocket,
  jsonMessage: string,
  clientId: string
) => {
  console.log(
    `[socketManager] INCOMING MESSAGE from ${clientId}:`,
    jsonMessage
  )
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
      case 'HRM_INPUT': {
        const existingClientData = hrmClients.get(clientId)
        console.log(
          `[socketManager] HRM_INPUT - clientId: ${clientId}, existingData:`,
          existingClientData,
          'newValue:',
          message.data.value
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
          console.log(
            `[socketManager] HRM_INPUT - Updated clientData for ${clientId}:`,
            hrmClients.get(clientId)
          )
        }
<<<<<<< HEAD
        broadcast({
          type: 'HRM_UPDATE',
          payload: Array.from(clientData.values()),
        })
||||||| 2286026
        broadcastState()
=======
        broadcast({
          type: 'HRM_UPDATE',
          payload: Array.from(hrmClients.values()),
        })
>>>>>>> origin/leader
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
