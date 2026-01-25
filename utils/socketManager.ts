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
import { HrmDataRepository } from '../lib/repositories/HrmDataRepository.js'
import { AppServices } from '../lib/services.js'
import { env } from '../lib/env.js'
import { roundTo } from '../lib/utils.js'

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

// Represents the internal state for a client's session.
interface ClientSession {
  lastUpdate: number
  accumulatedCalories: number
  disconnectedAt?: number // Timestamp of when the client disconnected
}

// Track internal state for calculations (not sent to client)
const clientSessionState = new Map<string, ClientSession>()

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
  clientId: string
): Record<string, unknown> => {
  // DEV-NOTE: Be mindful of logging sensitive data. In a real-world scenario,
  // IP addresses and user-agents might be considered PII and should be
  // handled according to privacy policies. Redacting in production is a safeguard.
  const isProduction = process.env.NODE_ENV === 'production'

  const ip = req.socket.remoteAddress
  const userAgent = req.headers['user-agent']
  const origin = req.headers.origin

  return {
    clientId,
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
  startCleanupTask()

  wss.on('connection', (ws: WebSocket, req: IncomingMessage) => {
    const extWs = ws as ExtWebSocket

    const params = getRequestParams(req)
    const clientId =
      params.get('clientId') ||
      `[GENERATED]-user-${Math.random().toString(36).substring(2, 9)}`
    const logMeta = getLogMeta(req, clientId)
    extWs.clientId = clientId

    // it's a stale or "zombie" connection. Overwrite it with the new socket.

    if (clientSockets.has(clientId)) {
      logger.warn(
        logMeta,
        'Existing socket found. Overwriting with new connection.'
      )
    }

    clientSockets.set(clientId, extWs)

    extWs.isAlive = true
    extWs.on('pong', () => {
      extWs.isAlive = true
    })

    logger.info(logMeta, 'WebSocket client connected')

    if (!hrmDataRepository.findById(clientId)) {
      // Initialize new client
      const newClient: HrmStreamData = {
        clientId: extWs.clientId,
        value: 0,
        maxHr: 185,
        age: 30,
        calories: 0, // Initialize to 0
      }
      hrmDataRepository.save(newClient)
      clientSessionState.set(extWs.clientId, {
        lastUpdate: Date.now(),
        accumulatedCalories: 0,
      })
    } else {
      // If the client is reconnecting, clear the disconnect marker.
      const session = clientSessionState.get(clientId)
      if (session?.disconnectedAt) {
        delete session.disconnectedAt
        logger.debug({ clientId }, 'Cleared disconnect marker on reconnect.')
      }
      logger.info({ clientId }, 'Reconnected with existing session.')
    }

    extWs.on('message', (message) => {
      handleIncomingMessage(extWs, message.toString(), extWs.clientId)
    })

    extWs.on('close', () => {
      logger.info({ clientId: extWs.clientId }, 'WebSocket client disconnected')
      // Instead of a timeout, mark the session with a timestamp.
      const session = clientSessionState.get(extWs.clientId)
      if (session) {
        session.disconnectedAt = Date.now()
        logger.debug(
          { clientId: extWs.clientId },
          'Marked client for cleanup.'
        )
      }

      // Important: Remove the socket reference immediately to prevent sending
      // messages to a closed socket. The session data is preserved.
      if (clientSockets.get(extWs.clientId) === extWs) {
        clientSockets.delete(extWs.clientId)
      }
    })
  })

  wss.on('close', () => {
    connectionMonitor.stop()
    stopCleanupTask()
  })
}

// In-memory store for the cleanup task interval ID.
let cleanupIntervalId: NodeJS.Timeout | null = null

/**
 * Periodically iterates through client sessions and removes those that have
 * been disconnected for longer than the grace period.
 */
const cleanupDisconnectedClients = () => {
  const now = Date.now()
  let hasChanged = false
  for (const [clientId, session] of clientSessionState.entries()) {
    if (session.disconnectedAt) {
      const timeSinceDisconnect = now - session.disconnectedAt
      if (timeSinceDisconnect > env.WEBSOCKET_GRACE_PERIOD_MS) {
        logger.info({ clientId }, 'Session expired. Deleting data.')
        try {
          hrmDataRepository.deleteById(clientId)
          clientSessionState.delete(clientId)
          hasChanged = true
        } catch (err) {
          logger.error(
            { clientId, error: err },
            'Error during session cleanup'
          )
        }
      }
    }
  }

  // If any clients were removed, broadcast the new state to all remaining clients.
  if (hasChanged) {
    broadcastState()
  }
}

/**
 * Starts the periodic cleanup of disconnected clients.
 */
const startCleanupTask = () => {
  // Stop any existing task before starting a new one.
  stopCleanupTask()

  // Set an interval to run the cleanup function periodically.
  // The interval is configured via environment variables.
  cleanupIntervalId = setInterval(
    cleanupDisconnectedClients,
    env.WEBSOCKET_CLEANUP_INTERVAL_MS
  )
  logger.info(
    { interval: env.WEBSOCKET_CLEANUP_INTERVAL_MS },
    'Started periodic client cleanup task.'
  )
}

/**
 * Stops the periodic cleanup task.
 */
const stopCleanupTask = () => {
  if (cleanupIntervalId) {
    clearInterval(cleanupIntervalId)
    cleanupIntervalId = null
    logger.info('Stopped periodic client cleanup task.')
  }
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
  // The 'isAlive' flag is now managed exclusively by the ConnectionMonitor's ping/pong mechanism.
  // Responding to any message is no longer considered a reliable indicator of a healthy connection,
  // especially in cases of network latency where messages might be buffered.
  try {
    const parsedJson = JSON.parse(messageString)
    const message = ClientCommandMessageSchema.parse(parsedJson)

    switch (message.type) {
      case 'PING': {
        // Respond to client heartbeat pings to keep the connection alive
        logger.info({ clientId }, 'Received PING, sending PONG.')
        const pongMessage: ServerMessage = { type: 'PONG' }
        sendWebSocketMessage(ws, pongMessage, 'socketManager.PING')
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

          // Prevent overwriting a real name with a default "Unknown" name
          if (
            existingData.name &&
            !/^(user|new user|unknown|bluetooth hrm)/i.test(
              existingData.name
            ) &&
            updateData.name &&
            /^(user|new user|unknown|bluetooth hrm)/i.test(updateData.name)
          ) {
            delete updateData.name
          }

          hrmDataRepository.save({ ...existingData, ...updateData })
        }
        broadcastState()
        break
      }
      case 'HRM_INPUT': {
        const existingData = hrmDataRepository.findById(clientId)
        const sessionState = clientSessionState.get(clientId)
        if (existingData && sessionState) {
          let finalCalories = 0
          // Prioritize client-calculated calories if available
          if (typeof message.data.calories === 'number') {
            const clientCalories = message.data.calories
            const serverCalories = sessionState.accumulatedCalories
            const diff = Math.abs(clientCalories - serverCalories)

            // Sanity check: a 50-calorie jump in one second is unlikely.
            if (diff > 50) {
              logger.warn(
                {
                  clientId,
                  clientCalories,
                  serverCalories,
                },
                'Large calorie discrepancy detected. Rejecting client update.'
              )
              finalCalories = serverCalories
            } else {
              finalCalories = clientCalories
              sessionState.accumulatedCalories = finalCalories
            }
          } else {
            // Fallback to server-side calculation for older clients
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
                weightKg: existingData.weightKg ?? CALORIE_DEFAULTS.WEIGHT_KG,
                durationMinutes: dtMinutes,
              })
              currentAccumulated += caloriesBurned
            }
            sessionState.accumulatedCalories = currentAccumulated
            finalCalories = currentAccumulated
          }
          // Update the repository with the latest data
          hrmDataRepository.save({
            ...existingData,
            value: message.data.value ?? existingData.value,
            calories: roundTo(finalCalories, 4),
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

export { initSocketManager, getRequestParams }
