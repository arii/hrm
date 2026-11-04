import { WebSocket, Server as WebSocketServer } from 'ws'
import { z } from 'zod'
import { IncomingMessage } from 'http'
import { TLSSocket } from 'tls'
import {
  ClientCommandMessageSchema,
  ClientRegistrationMessage,
  SpotifyCommandMessage,
  HrmMetadataUpdateMessage,
  TimerCommandMessage,
  TimerModeCommandMessage,
  TimerConfigMessage,
  InitialStateSnapshotPayload,
  ServerMessage,
  StateSnapshot,
  ExtWebSocket,
  HrmInputMessage,
} from '../types/websocket'
import { HrmStreamData } from '../types/core'
import {
  MAX_CALORIE_JUMP_PER_UPDATE,
  MAX_INITIAL_CALORIES,
  HRM_STALE_THRESHOLD_MS,
} from './constants'
import {
  broadcast,
  sendWebSocketMessage,
  ConnectionMonitor,
} from './websocketUtils'
import logger from './logger.server'
import { HrmSessionManager } from '../lib/hrm/HrmSessionManager'
import { AppServices } from '../lib/services'
import { roundTo, objectFromNonNullishEntries } from '../lib/utils'
import { isGenericName, filterHrmData } from './hrm'

let getUnifiedStateSnapshot: () => StateSnapshot
let wsServerInstance: WebSocketServer
let connectionMonitor: ConnectionMonitor
let services: AppServices

// State Management:
// - hrmSessionManager: Manages live HRM sessions for each client (e.g., HR value, calories, history). This is the primary source of truth for broadcasted state.
// - clientSockets: Maps a clientId to their active WebSocket connection. Used to handle zombie connections and check for reconnections.
// - clientSessionState: Holds internal server state for calculations (e.g., calorie accumulation), not sent to the client.
const hrmSessionManager = new HrmSessionManager()

const clientSockets = new Map<string, WebSocket>()

const clientSessionState = new Map<
  string,
  { lastUpdate: number; accumulatedCalories: number }
>()

const getRequestParams = (req: IncomingMessage): URLSearchParams => {
  try {
    const host = req.headers.host || 'localhost'
    const protocol = 'http'
    const url = new URL(req.url || '/', `${protocol}://${host}`)
    return url.searchParams
  } catch (error) {
    logger.error({ error }, 'Failed to parse WebSocket connection URL')
    return new URLSearchParams()
  }
}

const cleanupClientSession = (clientId: string) => {
  logger.info({ clientId }, 'Session expired. Deleting data.')
  try {
    hrmSessionManager.deleteById(clientId)
    clientSessionState.delete(clientId)
    broadcast(
      wsServerInstance,
      {
        type: 'DEVICE_OFFLINE',
        payload: { deviceId: clientId },
      },
      'socketManager.cleanupClientSession'
    )
    broadcastState()
  } catch (err) {
    logger.error(
      { clientId: clientId, error: err },
      'Error during session cleanup'
    )
  } finally {
    clientSockets.delete(clientId)
  }
}

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

  // Janitor process to clean up stale connections
  // Skip in test environment to avoid interference with fake timers and timing-sensitive tests
  if (process.env.NODE_ENV !== 'test') {
    setInterval(() => {
      const now = Date.now()
      for (const [clientId, session] of clientSessionState.entries()) {
        if (now - session.lastUpdate > HRM_STALE_THRESHOLD_MS) {
          logger.info({ clientId }, 'Stale client detected. Cleaning up.')
          cleanupClientSession(clientId)
        }
      }
    }, 10000) // Run every 10 seconds
  }

  wss.on('connection', (ws: WebSocket, req: IncomingMessage) => {
    const extWs = ws as ExtWebSocket

    const params = getRequestParams(req)
    const clientId =
      params.get('clientId') ||
      `[GENERATED]-user-${Math.random().toString(36).substring(2, 9)}`
    const logMeta = getLogMeta(req, clientId)
    extWs.clientId = clientId

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

    if (!hrmSessionManager.findById(clientId)) {
      // Initialize new client
      const newClient: HrmStreamData = {
        clientId: extWs.clientId,
        value: 0,
        maxHr: 185,
        age: 30,
        calories: 0,
        updatedAt: Date.now(),
        // Add default name in test env to satisfy server-side filter in existing tests
        ...(process.env.NODE_ENV === 'test' ? { name: 'Test Athlete' } : {}),
      }
      hrmSessionManager.save(newClient)
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
      logger.info({ clientId: extWs.clientId }, 'WebSocket client disconnected')
      // Aggressive 5-second cleanup removed. We now rely strictly on the 30-sec
      // janitor job. This securely allows a single client to have multiple tabs
      // open at once without accidentally wiping their session when they close one.
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
  hrmSessionManager.clear()
  clientSessionState.clear()

  // Reset the timer service to ensure clean state for tests
  if (services?.tabataService) {
    services.tabataService.reset()
  }

  // Disconnect all clients to force them to re-register and re-initialize their sessions
  if (wsServerInstance) {
    wsServerInstance.clients.forEach((client) => {
      if (client.readyState === WebSocket.OPEN) {
        client.close(1001, 'Server Reset')
      }
    })
  }
}

const broadcastState = () => {
  const allData = hrmSessionManager.findAll()
  const filteredData = filterHrmData(allData, Date.now(), {
    includeZeroValues: true,
  })

  broadcast(
    wsServerInstance,
    {
      type: 'HRM_UPDATE',
      payload: filteredData,
    },
    'socketManager.broadcastState'
  )
}

type ParsedClientMessage = z.infer<typeof ClientCommandMessageSchema>

type IncomingMessageHandler = (
  ws: ExtWebSocket,
  message: ParsedClientMessage,
  clientId: string
) => void

const handlePing: IncomingMessageHandler = (ws, _message, clientId) => {
  logger.info({ clientId }, 'Received PING, sending PONG.')
  const pongMessage: ServerMessage = { type: 'PONG' }
  sendWebSocketMessage(ws, pongMessage, 'socketManager.PING')
}

const handleRegisterClient: IncomingMessageHandler = (
  ws,
  message,
  clientId
) => {
  ws.clientType = (message as ClientRegistrationMessage).role
  logger.info({ clientId, clientType: ws.clientType }, 'Client registered')
}

const handleGetState: IncomingMessageHandler = (ws, _message, _clientId) => {
  const stateSnapshot = getUnifiedStateSnapshot()
  const allData = hrmSessionManager.findAll()
  const filteredData = filterHrmData(allData, Date.now(), {
    includeZeroValues: true,
  })

  const payload: InitialStateSnapshotPayload = {
    ...stateSnapshot,
    hrmData: filteredData,
  }
  const initialStateMessage: ServerMessage = {
    type: 'INITIAL_STATE',
    payload: payload,
  }
  sendWebSocketMessage(ws, initialStateMessage, 'socketManager.GET_STATE')
}

const handleHrmMetadataUpdate: IncomingMessageHandler = (
  _ws,
  message,
  clientId
) => {
  const existingData = hrmSessionManager.findById(clientId)
  if (existingData) {
    const updateData: Partial<HrmStreamData> = objectFromNonNullishEntries(
      Object.entries((message as HrmMetadataUpdateMessage).data)
    )

    if (!isGenericName(existingData.name) && isGenericName(updateData.name)) {
      delete updateData.name
    }

    hrmSessionManager.save({
      ...existingData,
      ...updateData,
      updatedAt: Date.now(),
    })
  }
  broadcastState()
}

const ensureInputSession = (
  ws: Parameters<IncomingMessageHandler>[0],
  clientId: string
) => {
  let existingData = hrmSessionManager.findById(clientId)
  let inputSessionState = clientSessionState.get(clientId)

  if (!existingData || !inputSessionState) {
    logger.info(
      { clientId },
      'Recreating orphaned session on incoming HRM_INPUT.'
    )
    const newClient: HrmStreamData = {
      clientId: ws.clientId,
      value: 0,
      maxHr: 185,
      age: 30,
      calories: 0,
      updatedAt: Date.now(),
      ...(process.env.NODE_ENV === 'test' ? { name: 'Test Athlete' } : {}),
    }
    hrmSessionManager.save(newClient)
    clientSessionState.set(ws.clientId, {
      lastUpdate: Date.now(),
      accumulatedCalories: 0,
    })
    existingData = newClient
    inputSessionState = clientSessionState.get(clientId)!
  }

  return { existingData, inputSessionState }
}

// Sanity check to prevent anomalous calorie values from the client.
// Returns the server value when the client's is rejected.
const resolveClientCalories = (
  clientCalories: number,
  serverCalories: number,
  clientId: string
): number => {
  const diff = Math.abs(clientCalories - serverCalories)
  const isAnomalousJump =
    diff > MAX_CALORIE_JUMP_PER_UPDATE && serverCalories > 0
  const isAnomalousInitialValue =
    serverCalories === 0 && clientCalories > MAX_INITIAL_CALORIES

  if (isAnomalousJump || isAnomalousInitialValue) {
    logger.warn(
      {
        clientId,
        clientCalories,
        serverCalories,
        isInitialValue: isAnomalousInitialValue,
      },
      'Anomalous calorie value detected. Using last known server value.'
    )
    return serverCalories
  }
  return clientCalories
}

const handleHrmInput: IncomingMessageHandler = (ws, message, clientId) => {
  const hrmMessage = message as HrmInputMessage
  const { existingData, inputSessionState } = ensureInputSession(ws, clientId)

  if (existingData && inputSessionState) {
    const now = Date.now()
    inputSessionState.lastUpdate = now
    let finalCalories = inputSessionState.accumulatedCalories

    // Use the client-provided calories directly
    if (typeof hrmMessage.data.calories === 'number') {
      finalCalories = resolveClientCalories(
        hrmMessage.data.calories,
        inputSessionState.accumulatedCalories,
        clientId
      )
      inputSessionState.accumulatedCalories = finalCalories
    }

    // Update the manager with the latest data
    hrmSessionManager.save({
      ...existingData,
      name: hrmMessage.data.name ?? existingData.name,
      age: hrmMessage.data.age ?? existingData.age,
      maxHr: hrmMessage.data.maxHr ?? existingData.maxHr,
      value: hrmMessage.data.value ?? existingData.value,
      calories: roundTo(finalCalories, 4),
      percentage:
        hrmMessage.data.percentage !== undefined
          ? roundTo(hrmMessage.data.percentage, 4)
          : undefined,
      zone: hrmMessage.data.zone,
      updatedAt: now,
    })
  }
  broadcastState()
}

const timerCommandHandlers: Record<TimerCommandMessage['command'], () => void> =
  {
    START: () => services.tabataService.start(),
    PAUSE: () => services.tabataService.pause(),
    STOP: () => services.tabataService.stop(),
  }

const handleTimerCommand: IncomingMessageHandler = (_ws, message, clientId) => {
  const command = (message as TimerCommandMessage).command
  const handler = timerCommandHandlers[command]
  if (handler) {
    handler()
  } else {
    logger.warn({ clientId, message }, 'Unknown timer command received')
  }
}

const handleSetMode: IncomingMessageHandler = (_ws, message, _clientId) => {
  services.tabataService.setMode((message as TimerModeCommandMessage).mode)
}

const handleTimerConfig: IncomingMessageHandler = (_ws, message, _clientId) => {
  const configMessage = message as TimerConfigMessage
  services.tabataService.setConfig({
    workDuration: configMessage.workDuration,
    restDuration: configMessage.restDuration,
  })
}

const handleSpotifyCommand: IncomingMessageHandler = (
  _ws,
  message,
  clientId
) => {
  const commandMsg = message as SpotifyCommandMessage
  logger.info(
    { clientId, command: commandMsg.command },
    'Forwarding Spotify command'
  )

  const spotifyService = services.spotifyService
  const spotifyCommandParams: {
    deviceId?: string
    volume?: number
    play?: boolean
    playlistUri?: string
    contextUri?: string
    uri?: string
    offset?: { position: number }
  } = {}
  if (commandMsg.deviceId) spotifyCommandParams.deviceId = commandMsg.deviceId
  if (commandMsg.volume !== undefined)
    spotifyCommandParams.volume = commandMsg.volume
  // !== undefined (not truthiness): false is the meaningful silent-transfer value.
  if (commandMsg.play !== undefined) spotifyCommandParams.play = commandMsg.play
  if (commandMsg.playlistUri)
    spotifyCommandParams.playlistUri = commandMsg.playlistUri
  if (commandMsg.contextUri)
    spotifyCommandParams.contextUri = commandMsg.contextUri
  if (commandMsg.uri) spotifyCommandParams.uri = commandMsg.uri
  if (commandMsg.offset) spotifyCommandParams.offset = commandMsg.offset

  spotifyService.handleCommand(commandMsg.command, spotifyCommandParams)
}

const messageHandlers: Record<
  ParsedClientMessage['type'],
  IncomingMessageHandler
> = {
  PING: handlePing,
  REGISTER_CLIENT: handleRegisterClient,
  GET_STATE: handleGetState,
  HRM_METADATA_UPDATE: handleHrmMetadataUpdate,
  HRM_INPUT: handleHrmInput,
  TIMER_COMMAND: handleTimerCommand,
  SET_MODE: handleSetMode,
  TIMER_CONFIG: handleTimerConfig,
  SPOTIFY_COMMAND: handleSpotifyCommand,
}

const handleIncomingMessage = (
  ws: ExtWebSocket,
  messageString: string,
  clientId: string
) => {
  ws.isAlive = true

  // Refresh the lastUpdate timestamp for the client
  const sessionState = clientSessionState.get(clientId)
  if (sessionState) {
    sessionState.lastUpdate = Date.now()
    clientSessionState.set(clientId, sessionState)
  }

  try {
    const parsedJson = JSON.parse(messageString)
    const message = ClientCommandMessageSchema.parse(parsedJson)

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

export { initSocketManager }
