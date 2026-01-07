// File: utils/socketManager.ts (WebSocket Manager - Typed)
/**
 * WebSocket Manager (Typed): Handles client connections, routes commands, and broadcasts state.
 */
import { WebSocket, Server as WebSocketServer } from 'ws'
import { z } from 'zod' // Import z from zod
import { IncomingMessage } from 'http'
import { TLSSocket } from 'tls'
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
import { AppServices } from '../lib/services.js'

// Define service instances to be managed
// New: Define a function to get the state snapshot
let getUnifiedStateSnapshot: () => StateSnapshot
// Store WebSocket server reference for command relay
let wsServerInstance: WebSocketServer
let connectionMonitor: ConnectionMonitor
let services: AppServices

// State Management:
// - sessionStore: Maps a sessionId to the complete state for that client's session.
//   This includes their HRM data, internal calculation state, and the active WebSocket connection.
interface SessionState {
  hrmData: HrmStreamData
  internalState: {
    lastUpdate: number
    accumulatedCalories: number
  }
  socket?: ExtWebSocket // The current active socket
}
const sessionStore = new Map<string, SessionState>()

/**
 * Safely parses the WebSocket request URL to extract search parameters.
 * Handles cases where headers or URL might be malformed.
 * @param req - The incoming HTTP request from the WebSocket upgrade.
 * @returns URLSearchParams object, which will be empty if parsing fails.
 */
const getRequestParams = (req: IncomingMessage): URLSearchParams => {
  try {
    // Fallback to localhost if host header is missing, which can happen in some proxy/test setups
    const host = req.headers.host || 'localhost'
    const protocol = 'http' // WebSocket upgrades start as HTTP
    const url = new URL(req.url || '/', `${protocol}://${host}`)
    return url.searchParams
  } catch (error) {
    logger.error({ error }, 'Failed to parse WebSocket connection URL')
    // Return empty params to prevent a crash on invalid URL
    return new URLSearchParams()
  }
}

/**
 * Creates a metadata object for logging, with sensitive data redaction in production.
 * @param req - The incoming HTTP request.
 * @param clientId - The client's identifier.
 * @returns An object with connection details for logging.
 */
const getLogMeta = (
  req: IncomingMessage,
  sessionId: string
): Record<string, unknown> => {
  // DEV-NOTE: Be mindful of logging sensitive data. In a real-world scenario,
  // IP addresses and user-agents might be considered PII and should be
  // handled according to privacy policies. Redacting in production is a safeguard.
  const isProduction = process.env.NODE_ENV === 'production'

  const ip = req.socket.remoteAddress
  const userAgent = req.headers['user-agent']
  const origin = req.headers.origin

  return {
    sessionId,
    ip: isProduction ? '[REDACTED]' : ip,
    isSecure: req.socket instanceof TLSSocket,
    origin: isProduction ? '[REDACTED]' : origin,
    userAgent: isProduction ? '[REDACTED]' : userAgent,
    host: req.headers.host || '[UNKNOWN]',
  }
}

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
  const cleanupInterval = setInterval(() => {
    const now = Date.now()
    sessionStore.forEach((session, sessionId) => {
      if (!session.socket) {
        // Disconnected
        const timeSinceLastUpdate = now - session.internalState.lastUpdate
        if (timeSinceLastUpdate > 30000) {
          // 30 seconds
          sessionStore.delete(sessionId)
          logger.info({ sessionId }, 'Stale session cleaned up.')
          broadcastState()
        }
      }
    })
  }, 10000) // Run every 10 seconds

  wss.on('connection', (ws: WebSocket, req: IncomingMessage) => {
    const extWs = ws as ExtWebSocket

    const params = getRequestParams(req)
    const sessionId =
      params.get('sessionId') ||
      `[GENERATED]-session-${Math.random().toString(36).substring(2, 9)}`
    const logMeta = getLogMeta(req, sessionId)

    extWs.sessionId = sessionId // Use sessionId as the primary identifier
    extWs.isAlive = true
    extWs.on('pong', () => {
      extWs.isAlive = true
    })

    logger.info(logMeta, 'WebSocket client connected')

    const existingSession = sessionStore.get(sessionId)

    if (existingSession) {
      // This is a reconnection.
      logger.info({ sessionId }, 'Reconnected with existing session.')
      existingSession.socket = extWs // Update the socket to the new connection
      // Immediately send the latest state to the reconnected client
      const stateSnapshot = getUnifiedStateSnapshot()
      const payload: InitialStateSnapshotPayload = {
        ...stateSnapshot,
        hrmData: Array.from(sessionStore.values()).map((s) => s.hrmData),
      }
      const initialStateMessage: ServerMessage = {
        type: 'INITIAL_STATE',
        payload: payload,
      }
      sendWebSocketMessage(
        extWs,
        initialStateMessage,
        'socketManager.reconnect'
      )
    } else {
      // This is a new session.
      logger.info({ sessionId }, 'New session started.')
      const newSession: SessionState = {
        hrmData: {
          clientId: sessionId,
          value: 0,
          maxHr: 185,
          age: 30,
          calories: 0,
        },
        internalState: {
          lastUpdate: Date.now(),
          accumulatedCalories: 0,
        },
        socket: extWs,
      }
      sessionStore.set(sessionId, newSession)
    }

    extWs.on('message', (message) => {
      handleIncomingMessage(extWs, message.toString(), sessionId)
    })

    extWs.on('close', () => {
      logger.info({ sessionId }, 'WebSocket client disconnected')

      const session = sessionStore.get(sessionId)
      if (session) {
        // Don't delete the session immediately.
        // Clear the socket to indicate disconnection.
        session.socket = undefined
        logger.info({ sessionId }, 'Socket cleared, session retained.')
        broadcastState()
      }
    })
  })

  wss.on('close', () => {
    connectionMonitor.stop()
    clearInterval(cleanupInterval)
  })
}

/**
 * Resets the socket manager state. Use this for testing purposes only.
 */
export const resetSocketManager = () => {
  sessionStore.clear()
}

const broadcastState = () => {
  const hrmDataPayload = Array.from(sessionStore.values()).map(
    (session) => session.hrmData
  )
  broadcast(
    wsServerInstance,
    {
      type: 'HRM_UPDATE',
      payload: hrmDataPayload,
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
  sessionId: string
) => {
  try {
    const parsedJson = JSON.parse(messageString)
    const message = ClientCommandMessageSchema.parse(parsedJson)

    switch (message.type) {
      case 'PING': {
        // Respond to client heartbeat pings to keep the connection alive
        logger.info({ sessionId }, 'Received PING, sending PONG.')
        const pongMessage: ServerMessage = { type: 'PONG' }
        sendWebSocketMessage(ws, pongMessage, 'socketManager.PING')
        break
      }
      case 'REGISTER_CLIENT': {
        ws.clientType = (message as ClientRegistrationMessage).role
        logger.info(
          { sessionId, clientType: ws.clientType },
          'Client registered'
        )
        break
      }
      case 'RECOVER_SESSION': {
        const session = sessionStore.get(sessionId)
        if (session) {
          logger.info({ sessionId }, 'Session recovery requested.')
          const stateSnapshot = getUnifiedStateSnapshot()
          const payload: InitialStateSnapshotPayload = {
            ...stateSnapshot,
            hrmData: Array.from(sessionStore.values()).map((s) => s.hrmData),
          }
          const initialStateMessage: ServerMessage = {
            type: 'INITIAL_STATE',
            payload: payload,
          }
          sendWebSocketMessage(
            ws,
            initialStateMessage,
            'socketManager.recoverSession'
          )
        } else {
          logger.warn(
            { sessionId },
            'Recovery requested for non-existent session.'
          )
        }
        break
      }
      case 'GET_STATE': {
        const stateSnapshot = getUnifiedStateSnapshot()
        const payload: InitialStateSnapshotPayload = {
          ...stateSnapshot,
          hrmData: Array.from(sessionStore.values()).map((s) => s.hrmData),
        }
        const initialStateMessage: ServerMessage = {
          type: 'INITIAL_STATE',
          payload: payload,
        }
        sendWebSocketMessage(ws, initialStateMessage, 'socketManager.GET_STATE')
        break
      }
      case 'HRM_METADATA_UPDATE': {
        const session = sessionStore.get(sessionId)
        if (session) {
          const updateData: Partial<HrmStreamData> = Object.fromEntries(
            Object.entries(message.data).filter(([_, value]) => value !== null)
          )
          // Prevent overwriting a real name with a default "Unknown" name
          if (
            session.hrmData.name &&
            !/^(user|new user|unknown|bluetooth hrm)/i.test(
              session.hrmData.name
            ) &&
            updateData.name &&
            /^(user|new user|unknown|bluetooth hrm)/i.test(updateData.name)
          ) {
            delete updateData.name
          }

          session.hrmData = { ...session.hrmData, ...updateData }
        }
        broadcastState()
        break
      }
      case 'HRM_INPUT': {
        const session = sessionStore.get(sessionId)
        if (session) {
          let finalCalories = 0
          if (typeof message.data.calories === 'number') {
            const clientCalories = message.data.calories
            const serverCalories = session.internalState.accumulatedCalories
            const diff = Math.abs(clientCalories - serverCalories)

            if (diff > 50) {
              logger.warn(
                {
                  sessionId,
                  clientCalories,
                  serverCalories,
                },
                'Large calorie discrepancy. Rejecting update.'
              )
              finalCalories = serverCalories
            } else {
              finalCalories = clientCalories
              session.internalState.accumulatedCalories = finalCalories
            }
          } else {
            const now = Date.now()
            const dtMinutes =
              (now - session.internalState.lastUpdate) / 1000 / 60
            session.internalState.lastUpdate = now
            let currentAccumulated = session.internalState.accumulatedCalories
            const currentHr = message.data.value ?? session.hrmData.value
            const currentAge = session.hrmData.age ?? 30
            if (currentHr > 30 && dtMinutes > 0 && dtMinutes < 5) {
              const caloriesBurned = estimateCaloriesBurned({
                heartRate: currentHr,
                age: currentAge,
                weightKg:
                  session.hrmData.weightKg ?? CALORIE_DEFAULTS.WEIGHT_KG,
                durationMinutes: dtMinutes,
              })
              currentAccumulated += caloriesBurned
            }
            session.internalState.accumulatedCalories = currentAccumulated
            finalCalories = currentAccumulated
          }

          session.hrmData.value = message.data.value ?? session.hrmData.value
          session.hrmData.calories = Math.round(finalCalories * 10) / 10
          session.hrmData.clientId = sessionId
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
          { sessionId, command: commandMsg.command },
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
          uri?: string
        } = {}
        if (commandMsg.deviceId)
          spotifyCommandParams.deviceId = commandMsg.deviceId
        if (commandMsg.volume !== undefined)
          spotifyCommandParams.volume = commandMsg.volume
        if (commandMsg.playlistUri)
          spotifyCommandParams.playlistUri = commandMsg.playlistUri
        if (commandMsg.contextUri)
          spotifyCommandParams.contextUri = commandMsg.contextUri
        if (commandMsg.uri) spotifyCommandParams.uri = commandMsg.uri

        spotifyService.handleCommand(commandMsg.command, spotifyCommandParams)
        break
      }
      default: {
        const unknownMessage = message as { type: unknown }
        logger.warn(
          { sessionId, type: unknownMessage.type },
          'Unknown message type received'
        )
        break
      }
    }
  } catch (e) {
    if (e instanceof z.ZodError) {
      logger.error(
        { sessionId, errors: e.issues },
        'WebSocket message validation failed'
      )
    } else {
      logger.error({ sessionId, error: e }, 'Error processing incoming message')
    }
  }
}

export { initSocketManager, getRequestParams }
