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
  connectionMonitor = new ConnectionMonitor(wss, {
    pingInterval: env.WEBSOCKET_PING_INTERVAL_MS,
    pingTimeout: env.WEBSOCKET_PING_TIMEOUT_MS,
  })
  connectionMonitor.start()

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

    extWs.on('pong', () => {
      // Clear the termination timeout set by ConnectionMonitor, indicating the client is responsive.
      if (extWs.terminationTimeout) {
        clearTimeout(extWs.terminationTimeout)
      }
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
      logger.info({ clientId }, 'Reconnected with existing session.')
    }

    extWs.on('message', (message) => {
      handleIncomingMessage(extWs, message.toString(), extWs.clientId)
    })

    extWs.on('close', () => {
      logger.info(
        {
          clientId: extWs.clientId,
          reason: extWs.terminationReason,
        },
        'WebSocket client disconnected'
      )

      // CRITICAL: Do NOT immediately delete clientData.
      // Wait a grace period (e.g., 5 seconds) to allow for page refresh.
      // NOTE: In a high-traffic production environment, this could lead to
      // memory pressure if many clients disconnect and don't reconnect.
      // A more robust solution might involve a separate cleanup process
      // or a maximum number of inactive sessions.
      setTimeout(() => {
        // Only delete if they haven't reconnected (i.e., the current socket is still this closed one)
        if (clientSockets.get(clientId) === extWs) {
          logger.info(
            { clientId: extWs.clientId },
            'Session expired. Deleting data.'
          )
          try {
            hrmDataRepository.deleteById(extWs.clientId)
            clientSessionState.delete(extWs.clientId)
            broadcastState()
          } catch (err) {
            logger.error(
              { clientId: extWs.clientId, error: err },
              'Error during session cleanup'
            )
          } finally {
            // Always remove the socket reference to prevent leaks
            clientSockets.delete(extWs.clientId)
          }
        }
      }, env.WEBSOCKET_GRACE_PERIOD_MS)

      // Clean up the heartbeat timeout on close
      if (extWs.terminationTimeout) {
        clearTimeout(extWs.terminationTimeout)
      }
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

import { ClientCommandMessage } from '../types/websocket'

// --- Message Handlers ---

const handleRegistration = (
  ws: ExtWebSocket,
  message: ClientCommandMessage
) => {
  const registrationMessage = message as ClientRegistrationMessage
  ws.clientType = registrationMessage.role
  logger.info(
    { clientId: ws.clientId, clientType: ws.clientType },
    'Client registered'
  )
}

const handleGetState = (ws: ExtWebSocket) => {
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
}

const handleHrmMetadataUpdate = (
  message: ClientCommandMessage,
  clientId: string
) => {
  const existingData = hrmDataRepository.findById(clientId)
  if (existingData) {
    const updateData: Partial<HrmStreamData> = Object.fromEntries(
      Object.entries(message.data).filter(([_, value]) => value !== null)
    )

    if (
      existingData.name &&
      !/^(user|new user|unknown|bluetooth hrm)/i.test(existingData.name) &&
      updateData.name &&
      /^(user|new user|unknown|bluetooth hrm)/i.test(updateData.name)
    ) {
      delete updateData.name
    }

    hrmDataRepository.save({ ...existingData, ...updateData })
    broadcastState()
  }
}

const handleHrmInput = (message: ClientCommandMessage, clientId: string) => {
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

    sessionState.accumulatedCalories = currentAccumulated
    hrmDataRepository.save({
      ...existingData,
      value: message.data.value ?? existingData.value,
      calories: Math.round(currentAccumulated * 10) / 10,
    })
    broadcastState()
  }
}

const handleTimerCommand = (message: ClientCommandMessage) => {
  services.tabataService.handleCommand(message.command)
}

const handleSetMode = (message: ClientCommandMessage) => {
  services.tabataService.setMode(message.mode)
}

const handleTimerConfig = (message: ClientCommandMessage) => {
  services.tabataService.setConfig({
    workDuration: message.workDuration,
    restDuration: message.restDuration,
  })
}

const handleSpotifyCommand = (
  message: ClientCommandMessage,
  clientId: string
) => {
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
  if (commandMsg.deviceId) spotifyCommandParams.deviceId = commandMsg.deviceId
  if (commandMsg.volume !== undefined)
    spotifyCommandParams.volume = commandMsg.volume
  if (commandMsg.playlistUri)
    spotifyCommandParams.playlistUri = commandMsg.playlistUri
  if (commandMsg.contextUri)
    spotifyCommandParams.contextUri = commandMsg.contextUri

  spotifyService.handleCommand(commandMsg.command, spotifyCommandParams)
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

    // A mapping of message types to their corresponding handler functions.
    // This approach replaces a verbose switch statement, making the code more
    // modular and easier to maintain. Each handler is responsible for a
    // specific message type.
    const messageHandlers: Record<
      string,
      (
        ws: ExtWebSocket,
        message: ClientCommandMessage,
        clientId: string
      ) => void
    > = {
      REGISTER_CLIENT: handleRegistration,
      GET_STATE: handleGetState,
      HRM_METADATA_UPDATE: (_ws, msg, id) => handleHrmMetadataUpdate(msg, id),
      HRM_INPUT: (_ws, msg, id) => handleHrmInput(msg, id),
      TIMER_COMMAND: (_ws, msg) => handleTimerCommand(msg),
      SET_MODE: (_ws, msg) => handleSetMode(msg),
      TIMER_CONFIG: (_ws, msg) => handleTimerConfig(msg),
      SPOTIFY_COMMAND: (_ws, msg, id) => handleSpotifyCommand(msg, id),
    }

    // PING is a no-op for backward compatibility and is handled separately.
    if (message.type === 'PING') {
      return
    }

    const handler = messageHandlers[message.type]

    if (handler) {
      handler(ws, message, clientId)
    } else {
      logger.warn(
        { clientId, type: message.type },
        'Unknown message type received'
      )
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
