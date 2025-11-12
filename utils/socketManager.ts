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
export let tabataServiceInstance: TabataTimer
export let spotifyServiceInstance: SpotifyPolling

export const clientData = new Map<
  WebSocket,
  {
    hrmData: HrmData
    userId?: string
    encryptedRefreshToken?: string
  }
>()

export const pollingIntervals = new Map<string, NodeJS.Timeout>()

interface Services {
  tabataService: TabataTimer
  spotifyService: SpotifyPolling
}

const getClientByUserId = (userId: string): WebSocket | undefined => {
  for (const [client, data] of clientData.entries()) {
    if (data.userId === userId) {
      return client
    }
  }
}

export const stopSpotifyPolling = (userId: string) => {
  if (pollingIntervals.has(userId)) {
    clearInterval(pollingIntervals.get(userId)!)
    pollingIntervals.delete(userId)
    console.log(`Stopped Spotify polling for user ${userId}.`)
  }
}

/**
 * Initializes the WebSocket Server manager and registers the core services.
 */
const initSocketManager = (wss: WebSocketServer, services: Services) => {
  wssInstance = wss
  tabataServiceInstance = services.tabataService
  spotifyServiceInstance = services.spotifyService

  wssInstance.on('connection', (ws: WebSocket) => {
    console.log(`WebSocket Client connected.`)

    // Initialize with placeholder HRM data
    const newClient: HrmData = {
      clientId: `user-${Math.random().toString(36).substring(2, 9)}`,
      value: 0,
      maxHr: 185,
      age: 30,
    }
    clientData.set(ws, { hrmData: newClient })

    ws.on('message', (message) => {
      handleIncomingMessage(ws, message.toString())
    })

    ws.on('close', () => {
      console.log(`WebSocket Client disconnected.`)
      const userData = clientData.get(ws)
      if (userData?.userId) {
        stopSpotifyPolling(userData.userId)
      }
      clientData.delete(ws)
      broadcastState()
    })
  })
}

export const broadcastState = () => {
  const allHrmData = Array.from(clientData.values()).map((data) => data.hrmData)
  const timerData = tabataServiceInstance.getState()

  clientData.forEach((data, client) => {
    if (client.readyState === WebSocket.OPEN) {
      const message: Partial<UnifiedStateMessage> = {
        type: 'STATE_UPDATE',
        hrmData: allHrmData,
        timerData: timerData,
      }
      // Note: Spotify data is sent via its own polling loop, not here.
      client.send(JSON.stringify(message))
    }
  })
}

export const pollSpotify = async (
  userId: string,
  encryptedRefreshToken: string
) => {
  if (!spotifyServiceInstance) return
  await spotifyServiceInstance.pollUser(userId, encryptedRefreshToken)
}

import { handleIdentify } from './socketHandlers/identifyHandler.js'
import { handleHrmInput } from './socketHandlers/hrmInputHandler.js'
import { handleTimerCommand } from './socketHandlers/timerCommandHandler.js'
import { handleSetMode } from './socketHandlers/setModeHandler.js'
import { handleTimerConfig } from './socketHandlers/timerConfigHandler.js'
import { handleSpotifyCommand } from './socketHandlers/spotifyCommandHandler.js'

/**
 * Handles incoming JSON messages from client applications.
 */
const handleIncomingMessage = (ws: WebSocket, messageString: string) => {
  console.log(`[socketManager] INCOMING MESSAGE:`, messageString)
  try {
    const parsedJson = JSON.parse(messageString)
    const message = ClientCommandMessageSchema.parse(parsedJson)

    switch (message.type) {
      case 'IDENTIFY':
        handleIdentify(ws, message)
        break
      case 'HRM_INPUT':
        handleHrmInput(ws, message)
        break
      case 'TIMER_COMMAND':
        handleTimerCommand(message)
        break
      case 'SET_MODE':
        handleSetMode(message)
        break
      case 'TIMER_CONFIG':
        handleTimerConfig(message)
        break
      case 'SPOTIFY_COMMAND':
        handleSpotifyCommand(ws, message)
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

export { initSocketManager, getClientByUserId }
