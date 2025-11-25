// File: utils/socketManager.ts (Refactored for Topic-Based Broadcasts)
/**
 * WebSocket Manager (Typed): Handles client connections, routes commands, and
 * broadcasts granular, topic-based state updates.
 */
import { WebSocket, Server as WebSocketServer } from 'ws'
import { z } from 'zod'
import { SpotifyPolling } from '../services/spotifyPolling.js'
import TabataTimer from '../services/tabataTimer.js'
import {
  ClientCommandMessageSchema,
  HrmData,
  TimerData,
  SpotifyData,
  ServerMessage,
  InitialStateMessage,
} from '../types/websocket.js'

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
export const initSocketManager = (wss: WebSocketServer, services: Services) => {
  wssInstance = wss
  tabataServiceInstance = services.tabataService
  spotifyServiceInstance = services.spotifyService

  wssInstance.on('connection', (ws: WebSocket) => {
    const clientId = `user-${Math.random().toString(36).substring(2, 9)}`
    console.log(`WebSocket Client connected: ${clientId}`)

    const newClient: HrmData = {
      clientId,
      value: 0,
      maxHr: 185,
      age: 30,
    }
    clientData.set(clientId, newClient)

    const initialState: InitialStateMessage = {
      type: 'INITIAL_STATE',
      payload: {
        hrmData: Array.from(clientData.values()),
        timerData: tabataServiceInstance.getState(),
        spotifyData: spotifyServiceInstance.getState(),
        spotifyServiceInitialized: spotifyServiceInstance.isReady(),
      },
    }
    ws.send(JSON.stringify(initialState))

    // Broadcast the updated HRM data to all clients
    broadcastHrmUpdate()

    ws.on('message', (message) => {
      handleIncomingMessage(ws, message.toString(), clientId)
    })

    ws.on('close', () => {
      console.log(`WebSocket Client disconnected: ${clientId}`)
      clientData.delete(clientId)
      broadcastHrmUpdate() // Notify all clients about the roster change
    })
  })
}

/**
 * Broadcasts a message to all connected and open WebSocket clients.
 */
const broadcast = (message: ServerMessage) => {
  if (!wssInstance) return
  const serializedMessage = JSON.stringify(message)
  wssInstance.clients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(serializedMessage)
    }
  })
}

export const broadcastHrmUpdate = () => {
  broadcast({
    type: 'HRM_UPDATE',
    payload: Array.from(clientData.values()),
  })
}

export const broadcastTimerUpdate = (data: TimerData) => {
  broadcast({
    type: 'TIMER_UPDATE',
    payload: data,
  })
}

export const broadcastSpotifyUpdate = (data: SpotifyData) => {
  broadcast({
    type: 'SPOTIFY_UPDATE',
    payload: data,
  })
}

const handleIncomingMessage = (
  _ws: WebSocket,
  messageString: string,
  clientId: string
) => {
  try {
    const message = ClientCommandMessageSchema.parse(JSON.parse(messageString))

    switch (message.type) {
      case 'HRM_INPUT': {
        const existingData = clientData.get(clientId)
        if (existingData) {
          const updateData = Object.fromEntries(
            Object.entries(message.data).filter(([_, v]) => v !== null)
          )
          clientData.set(clientId, { ...existingData, ...updateData })
        }
        broadcastHrmUpdate()
        break
      }

      case 'TIMER_COMMAND': {
        tabataServiceInstance?.handleCommand(message.command)
        // Server-side orchestration: link timer commands to Spotify playback
        if (message.deviceId) {
          if (message.command === 'START') {
            spotifyServiceInstance?.handleCommand('NEXT', message.deviceId)
          } else if (message.command === 'STOP') {
            spotifyServiceInstance?.handleCommand('PAUSE', message.deviceId)
          }
        }
        break
      }

      case 'SET_MODE': {
        tabataServiceInstance?.setMode(message.mode)
        break
      }

      case 'TIMER_CONFIG': {
        tabataServiceInstance?.setConfig({
          workDuration: message.workDuration,
          restDuration: message.restDuration,
        })
        break
      }

      case 'SPOTIFY_COMMAND': {
        spotifyServiceInstance?.handleCommand(
          message.command,
          message.deviceId,
          message.volume,
          message.playlistUri
        )
        break
      }

      default:
        console.warn('Unknown message type received:', (message as any).type)
    }
  } catch (e) {
    if (e instanceof z.ZodError) {
      console.error('WebSocket message validation failed:', e.issues)
    } else {
      console.error('Error processing incoming message:', e)
    }
  }
}
