// File: utils/socketManager.ts (WebSocket Manager - Secure & Typed)
/**
 * WebSocket Manager (Secure & Typed): Handles client connections, enforces
 * authentication, routes commands, and broadcasts state.
 */
import { WebSocket, Server as WebSocketServer } from 'ws'
import { z } from 'zod'
import { WEBSOCKET_AUTH_MESSAGE_TYPE } from '../lib/auth/consts'
import { decodeSessionToken } from '../lib/auth/utils'
import { SpotifyPolling } from '../services/spotifyPolling'
import TabataTimer from '../services/tabataTimer'
import {
  ClientCommandMessageSchema,
  HrmData,
<<<<<<< HEAD
  UnifiedStateMessage,
} from '../types/websocket'
import logger from './logger'

// --- Extended WebSocket Type ---
interface AuthenticatedWebSocket extends WebSocket {
  isAlive: boolean
  isAuthenticated: boolean
  userId: string | null
}
||||||| 2286026
  UnifiedStateMessage,
} from '../types/websocket.js'
=======
  ServerMessage,
} from '../types/websocket.js'
import { broadcast, initBroadcaster } from './broadcast.js'
>>>>>>> origin/leader

<<<<<<< HEAD
// --- Module-level State ---
let wssInstance: WebSocketServer
||||||| 2286026
// Define service instances to be managed
let wssInstance: WebSocketServer
=======
// Define service instances to be managed
>>>>>>> origin/leader
let tabataServiceInstance: TabataTimer
let spotifyServiceInstance: SpotifyPolling

// Map to store HRM data, keyed by authenticated userId
const hrmDataMap = new Map<string, HrmData>()

// --- Services Interface ---
interface Services {
  tabataService: TabataTimer
  spotifyService: SpotifyPolling
}

/**
 * Initializes the WebSocket Server manager, registers services, and sets up security.
 */
<<<<<<< HEAD
export const initSocketManager = (
  wss: WebSocketServer,
  services: Services,
  spotifyServiceInitialized: boolean
) => {
  wssInstance = wss
||||||| 2286026
const initSocketManager = (wss: WebSocketServer, services: Services) => {
  wssInstance = wss
=======
const initSocketManager = (wss: WebSocketServer, services: Services) => {
  initBroadcaster(wss)
>>>>>>> origin/leader
  tabataServiceInstance = services.tabataService
  spotifyServiceInstance = services.spotifyService
  broadcastState(spotifyServiceInitialized)

  // --- Connection Handler with Authentication ---
  wssInstance.on('connection', (ws: AuthenticatedWebSocket) => {
    logger.info('WebSocket client connecting...')
    // Initialize custom state properties
    ws.isAlive = true
    ws.isAuthenticated = false
    ws.userId = null

    // Set a timeout for authentication
    const authTimeout = setTimeout(() => {
      if (!ws.isAuthenticated) {
        logger.warn('Client failed to authenticate in time. Closing connection.')
        ws.terminate()
      }
    }, 5000) // 5 seconds to authenticate

<<<<<<< HEAD
    ws.on('pong', () => {
      ws.isAlive = true
    })

    ws.on('message', (message: string) => {
      // Pass the WebSocket instance to the handler for state management
      handleIncomingMessage(ws, message, authTimeout)
||||||| 2286026
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
=======
  wss.on('connection', (ws: WebSocket) => {
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
>>>>>>> origin/leader
    })

    ws.on('close', () => {
<<<<<<< HEAD
      logger.info(
        `WebSocket client disconnected: ${ws.userId || 'unauthenticated'}`
      )
      if (ws.userId) {
        hrmDataMap.delete(ws.userId)
        broadcastState() // Notify clients of the disconnection
      }
    })
  })

  // --- Health Check Interval ---
  const interval = setInterval(() => {
    wssInstance.clients.forEach((ws) => {
      const authWs = ws as AuthenticatedWebSocket
      if (!authWs.isAlive) {
        logger.warn(`Terminating stale connection: ${authWs.userId}`)
        return authWs.terminate()
      }
      authWs.isAlive = false
      authWs.ping()
||||||| 2286026
      console.log(`WebSocket Client disconnected: ${clientId}`)
      clientData.delete(clientId)
      broadcastState()
=======
      console.log(`WebSocket Client disconnected: ${clientId}`)
      clientData.delete(clientId)
      broadcast({
        type: 'HRM_UPDATE',
        payload: Array.from(clientData.values()),
      })
>>>>>>> origin/leader
    })
  }, 30000) // 30 seconds

  wssInstance.on('close', () => {
    clearInterval(interval)
  })
}

<<<<<<< HEAD
/**
 * Broadcasts the current unified state to all authenticated clients.
 */
const broadcastState = (spotifyServiceInitialized?: boolean) => {
  if (!wssInstance) return

  const message: UnifiedStateMessage = {
    type: 'STATE_UPDATE',
    hrmData: Array.from(hrmDataMap.values()),
    timerData: tabataServiceInstance.getState(),
    spotifyData: spotifyServiceInstance.getState(),
  }
  if (spotifyServiceInitialized !== undefined) {
    message.spotifyServiceInitialized = spotifyServiceInitialized
  }

  wssInstance.clients.forEach((client) => {
    const authClient = client as AuthenticatedWebSocket
    // Only send updates to authenticated clients
    if (authClient.readyState === WebSocket.OPEN && authClient.isAuthenticated) {
      authClient.send(JSON.stringify(message))
    }
  })
}

||||||| 2286026
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

=======
>>>>>>> origin/leader
/**
 * Handles all incoming messages from clients, routing them based on type and auth state.
 */
const handleIncomingMessage = async (
  ws: AuthenticatedWebSocket,
  messageString: string,
  authTimeout: NodeJS.Timeout
) => {
  let parsedJson: any
  try {
    parsedJson = JSON.parse(messageString)
  } catch (e) {
    logger.error({ error: e }, 'Failed to parse incoming WebSocket message')
    return
  }

  // --- Authentication Flow ---
  if (parsedJson.type === WEBSOCKET_AUTH_MESSAGE_TYPE) {
    if (ws.isAuthenticated) {
      logger.warn('Client sent duplicate IDENTIFY message.')
      return
    }

    const { token } = parsedJson
    const decodedToken = await decodeSessionToken(token)

    if (decodedToken && decodedToken.userId) {
      ws.isAuthenticated = true
      ws.userId = decodedToken.userId
      clearTimeout(authTimeout) // Clear the disconnection timeout

      // Initialize HRM data for the new user
      const newClientHrm: HrmData = {
        clientId: ws.userId,
        value: 0,
        maxHr: 185,
        age: 30,
      }
      hrmDataMap.set(ws.userId, newClientHrm)

      logger.info(`WebSocket client authenticated: ${ws.userId}`)

      // Send initial state to the newly authenticated client
      ws.send(
        JSON.stringify({
          type: 'STATE_UPDATE',
          hrmData: Array.from(hrmDataMap.values()),
          timerData: tabataServiceInstance.getState(),
          spotifyData: spotifyServiceInstance.getState(),
        } as UnifiedStateMessage)
      )
      // Broadcast to all clients to notify of the new user
      broadcastState()
    } else {
      logger.warn('WebSocket authentication failed. Closing connection.')
      ws.terminate()
    }
    return
  }

  // --- Protected Routes: Block unauthenticated access ---
  if (!ws.isAuthenticated || !ws.userId) {
    logger.warn('Unauthenticated client tried to send a command. Terminating.')
    ws.terminate()
    return
  }

  // --- Command Processing for Authenticated Clients ---
  try {
    const message = ClientCommandMessageSchema.parse(parsedJson)
    const userId = ws.userId // Guaranteed to be non-null here

    switch (message.type) {
      case 'HRM_INPUT': {
        const existingData = hrmDataMap.get(userId)
        if (existingData) {
          const updateData = Object.fromEntries(
            Object.entries(message.data).filter(([_, value]) => value !== null)
          )
          hrmDataMap.set(userId, { ...existingData, ...updateData })
        }
        broadcast({
          type: 'HRM_UPDATE',
          payload: Array.from(clientData.values()),
        })
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
        logger.warn({ type: (message as any).type }, 'Unknown message type received')
    }
  } catch (e) {
    if (e instanceof z.ZodError) {
      logger.error({ issues: e.issues }, 'WebSocket message validation failed')
    } else {
      logger.error({ error: e }, 'Error processing incoming message')
    }
  }
}

// Export the init function and the broadcast function for service-level updates
export { broadcastState }
