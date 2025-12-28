// File: utils/socketManager.ts (WebSocket Manager - Typed)
/**
 * WebSocket Manager (Typed): Handles client connections, routes commands, and broadcasts state.
 */
import { WebSocket, Server as WebSocketServer } from 'ws'
import { z } from 'zod' // Import z from zod
import { IncomingMessage } from 'http'
import { randomUUID } from 'crypto'
import {
  ClientCommandMessageSchema,
  ClientRegistrationMessage,
  SpotifyCommandMessage,
  SpotifyExecutionMessage,
  InitialStateSnapshotPayload,
  ServerMessage,
  StateSnapshot,
  ExtWebSocket,
} from '../types/websocket.js'
import { HrmStreamData } from '../types/core.js'
import { CALORIE_DEFAULTS } from './constants.js' // Ensure this import exists
import {
  broadcast,
  sendWebSocketMessage,
  ConnectionMonitor,
} from './websocketUtils.js'
import logger from './logger.js'
import { estimateCaloriesBurned } from '../lib/calorie-estimation.js'
import { HrmDataRepository } from '../lib/repositories/HrmDataRepository.js'
import { AppServices } from '../lib/services.js'
import { env } from '../lib/env.js'

// Define service instances to be managed
// New: Define a function to get the state snapshot
let getUnifiedStateSnapshot: () => StateSnapshot
// Store WebSocket server reference for command relay
let wsServerInstance: WebSocketServer
let connectionMonitor: ConnectionMonitor
let services: AppServices

// State Management:
// - hrmDataRepository: Stores the live HRM data for each client (e.g., HR value, calories). This is the primary source of truth for broadcasted state.
// - clientSockets: Maps a clientId to their active WebSocket connection. Used to handle zombie connections and check for reconnections.
// - clientSessionState: Holds internal server state for calculations (e.g., calorie accumulation), not sent to the client.
const hrmDataRepository = new HrmDataRepository()

// Track active sockets separately so we can handle "zombie" sockets during reconnects
const clientSockets = new Map<string, WebSocket>()

// Track internal state for calculations (not sent to client)
const clientSessionState = new Map<
  string,
  { lastUpdate: number; accumulatedCalories: number }
>()

/**
 * Initializes the WebSocket Server manager and registers the core services.
 */
const initSocketManager = (
  wss: WebSocketServer,
  getSnapshot: () => StateSnapshot,
  svcs: AppServices
) => {
  wsServerInstance = wss
  getUnifiedStateSnapshot = getSnapshot
  services = svcs
  connectionMonitor = new ConnectionMonitor(wss)
  connectionMonitor.start()

  wss.on('connection', (ws: WebSocket, req: IncomingMessage) => {
    const extWs = ws as ExtWebSocket
    extWs.isAlive = true
    extWs.on('pong', () => {
      extWs.isAlive = true
    })

    // 1. EXTRACT OR GENERATE STABLE ID
    const url = new URL(
      req.url || '',
      `http://${req.headers.host || 'localhost'}`
    )
    const requestedId = url.searchParams.get('clientId')

    // Validate requestedId to prevent injection/garbage
    const isValidId = requestedId && /^[0-9a-f-]{36}$/i.test(requestedId)
    if (requestedId && !isValidId) {
      logger.warn(
        { requestedId },
        'Invalid clientId received. Generating new one.'
      )
    }
    const clientId = isValidId ? requestedId : randomUUID()
    extWs.clientId = clientId // Keep it on the socket for logging/context

    logger.info(
      { clientId, isReconnection: !!isValidId },
      'WebSocket client connected'
    )

    // 2. HANDLE CONFLICTS / ZOMBIES
    if (clientSockets.has(clientId)) {
      const oldWs = clientSockets.get(clientId)
      if (oldWs && oldWs !== ws && oldWs.readyState === WebSocket.OPEN) {
        logger.warn({ clientId }, 'Terminating zombie connection')
        oldWs.terminate()
      }
    }
    clientSockets.set(clientId, ws)

    // 3. INITIALIZE OR RECOVER DATA
    if (!hrmDataRepository.findById(clientId)) {
      logger.info({ clientId }, 'Initializing new client session')
      const newClient: HrmStreamData = {
        clientId: clientId,
        value: 0,
        maxHr: 185,
        age: 30,
        calories: 0,
      }
      hrmDataRepository.save(newClient)
      clientSessionState.set(clientId, {
        lastUpdate: Date.now(),
        accumulatedCalories: 0,
      })
    } else {
      logger.info({ clientId }, 'Restored existing client session')
    }

    extWs.on('message', (message) => {
      handleIncomingMessage(extWs, message.toString(), clientId)
    })

    extWs.on('close', () => {
      logger.info({ clientId }, 'WebSocket client disconnected')

      // CRITICAL: Do NOT immediately delete clientData.
      // Wait a grace period (e.g., 5 seconds) to allow for page refresh.
      // NOTE: In a high-traffic production environment, this could lead to
      // memory pressure if many clients disconnect and don't reconnect.
      // A more robust solution might involve a separate cleanup process
      // or a maximum number of inactive sessions.
      setTimeout(() => {
        // Only delete if they haven't reconnected (i.e., the current socket is still this closed one)
        if (clientSockets.get(clientId) === ws) {
          logger.info({ clientId }, 'Session expired. Deleting data.')
          hrmDataRepository.deleteById(clientId)
          clientSessionState.delete(clientId)
          clientSockets.delete(clientId)
          broadcastState()
        }
      }, env.WEBSOCKET_GRACE_PERIOD_MS)
    })
  })

  wss.on('close', () => {
    connectionMonitor.stop()
  })
}

/**
 * Resets the socket manager state. Use this for testing purposes only.
 */
export const resetSocketManager = () => {
  hrmDataRepository.clear()
  clientSessionState.clear()
}

const broadcastState = () => {
  broadcast(
    wsServerInstance,
    {
      type: 'HRM_UPDATE',
      payload: hrmDataRepository.findAll(),
    },
    'socketManager.broadcastState'
  )
}

/**
 * Handles incoming JSON messages from client applications.
 */
const handleIncomingMessage = (
  ws: ExtWebSocket,
  messageString: string,
  clientId: string
) => {
  try {
    const parsedJson = JSON.parse(messageString)
    const message = ClientCommandMessageSchema.parse(parsedJson)

    switch (message.type) {
      case 'PING': {
        // This is now a no-op. The server relies on native WebSocket ping/pong
        // frames for heartbeat. The case is retained for backward
        // compatibility with older clients that might still send this message.
        break
      }
      case 'REGISTER_CLIENT': {
        ws.clientType = (message as ClientRegistrationMessage).role
        logger.info(
          { clientId, clientType: ws.clientType },
          'Client registered'
        )
        break
      }
      case 'GET_STATE': {
        const stateSnapshot = getUnifiedStateSnapshot()
        const payload: InitialStateSnapshotPayload = {
          ...stateSnapshot,
          hrmData: hrmDataRepository.findAll(),
        }
        const initialStateMessage: ServerMessage = {
          type: 'INITIAL_STATE',
          payload: payload,
        }
        sendWebSocketMessage(ws, initialStateMessage, 'socketManager.GET_STATE')
        break
      }
      case 'HRM_METADATA_UPDATE': {
        const existingData = hrmDataRepository.findById(clientId)
        if (existingData) {
          const updateData: Partial<HrmStreamData> = Object.fromEntries(
            Object.entries(message.data).filter(([_, value]) => value !== null)
          )
          hrmDataRepository.save({ ...existingData, ...updateData })
        }
        broadcastState()
        break
      }
      case 'HRM_INPUT': {
        const existingData = hrmDataRepository.findById(clientId)
        const sessionState = clientSessionState.get(clientId)

        if (existingData && sessionState) {
          const now = Date.now()
          const dtMinutes = (now - sessionState.lastUpdate) / 1000 / 60
          sessionState.lastUpdate = now

          let currentAccumulated = sessionState.accumulatedCalories
          const currentHr = message.data.value ?? existingData.value
          const currentAge = existingData.age ?? 30

          if (currentHr > 30 && dtMinutes > 0 && dtMinutes < 5) {
            const caloriesBurned = estimateCaloriesBurned({
              heartRate: currentHr,
              age: currentAge,
              weightKg: CALORIE_DEFAULTS.WEIGHT_KG,
              durationMinutes: dtMinutes,
            })
            currentAccumulated += caloriesBurned
          }

          // Update the internal state with high precision value
          sessionState.accumulatedCalories = currentAccumulated

          // ONLY update the value and calories
          hrmDataRepository.save({
            ...existingData,
            value: message.data.value ?? existingData.value,
            calories: Math.round(currentAccumulated * 10) / 10,
          })
        }
        broadcastState()
        break
      }

      case 'TIMER_COMMAND':
        services.tabataService.handleCommand(message.command)
        break

      case 'SET_MODE':
        services.tabataService.setMode(message.mode)
        break

      case 'TIMER_CONFIG':
        services.tabataService.setConfig({
          workDuration: message.workDuration,
          restDuration: message.restDuration,
        })
        break

      case 'SPOTIFY_COMMAND': {
        const commandMsg = message as SpotifyCommandMessage
        logger.info(
          { clientId, command: commandMsg.command },
          'Forwarding Spotify command'
        )

        wsServerInstance.clients.forEach((client: WebSocket) => {
          const target = client as ExtWebSocket
          if (
            target.readyState === WebSocket.OPEN &&
            target.clientType === 'dashboard'
          ) {
            const executionMessage: SpotifyExecutionMessage = {
              type: 'EXECUTE_SPOTIFY',
              payload: commandMsg,
            }
            sendWebSocketMessage(
              target,
              executionMessage,
              'socketManager.SPOTIFY_COMMAND'
            )
          }
        })

        const spotifyService = services.spotifyService
        const spotifyCommandParams: {
          deviceId?: string
          volume?: number
          playlistUri?: string
          contextUri?: string
        } = {}
        if (commandMsg.deviceId)
          spotifyCommandParams.deviceId = commandMsg.deviceId
        if (commandMsg.volume !== undefined)
          spotifyCommandParams.volume = commandMsg.volume
        if (commandMsg.playlistUri)
          spotifyCommandParams.playlistUri = commandMsg.playlistUri
        if (commandMsg.contextUri)
          spotifyCommandParams.contextUri = commandMsg.contextUri

        spotifyService.handleCommand(commandMsg.command, spotifyCommandParams)
        break
      }
      default: {
        const unknownMessage = message as { type: unknown }
        logger.warn(
          { clientId, type: unknownMessage.type },
          'Unknown message type received'
        )
        break
      }
    }
  } catch (e) {
    if (e instanceof z.ZodError) {
      logger.error(
        { clientId, errors: e.issues },
        'WebSocket message validation failed'
      )
    } else {
      logger.error({ clientId, error: e }, 'Error processing incoming message')
    }
  }
}

export { initSocketManager }
