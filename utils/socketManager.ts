import { WebSocket, Server as WebSocketServer } from 'ws'
import { z } from 'zod'
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
import { CALORIE_DEFAULTS } from './constants.js'
import {
  broadcast,
  sendWebSocketMessage,
  ConnectionMonitor,
} from './websocketUtils.js'
import logger from './logger.js'
import { estimateCaloriesBurned } from '../lib/calorie-estimation.js'
import { HrmDataStore } from '../lib/hrm/HrmDataStore.js'
import { AppServices } from '../lib/services.js'
import { env } from '../lib/env.js'
import { roundTo } from '../lib/utils.js'

let getUnifiedStateSnapshot: () => StateSnapshot
let wsServerInstance: WebSocketServer
let connectionMonitor: ConnectionMonitor
let services: AppServices

// State Management:
// - hrmDataStore: Stores the live HRM data for each client (e.g., HR value, calories). This is the primary source of truth for broadcasted state.
// - clientSockets: Maps a clientId to their active WebSocket connection. Used to handle zombie connections and check for reconnections.
// - clientSessionState: Holds internal server state for calculations (e.g., calorie accumulation), not sent to the client.
const hrmDataStore = new HrmDataStore()

const clientSockets = new Map<string, WebSocket>()

const clientSessionState = new Map<
  string,
  { lastUpdate: number; accumulatedCalories: number }
>()

const clientCleanupTimers = new Map<string, NodeJS.Timeout>()

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
    hrmDataStore.deleteById(clientId)
    clientSessionState.delete(clientId)
    broadcastState()
  } catch (err) {
    logger.error(
      { clientId: clientId, error: err },
      'Error during session cleanup'
    )
  } finally {
    clientSockets.delete(clientId)
    clientCleanupTimers.delete(clientId)
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

  wss.on('connection', (ws: WebSocket, req: IncomingMessage) => {
    const extWs = ws as ExtWebSocket

    const params = getRequestParams(req)
    const clientId =
      params.get('clientId') ||
      `[GENERATED]-user-${Math.random().toString(36).substring(2, 9)}`
    const logMeta = getLogMeta(req, clientId)
    extWs.clientId = clientId

    if (clientCleanupTimers.has(clientId)) {
      clearTimeout(clientCleanupTimers.get(clientId))
      clientCleanupTimers.delete(clientId)
      logger.info({ clientId }, 'Cleared cleanup timer for reconnected client.')
    }

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

    if (!hrmDataStore.findById(clientId)) {
      // Initialize new client
      const newClient: HrmStreamData = {
        clientId: extWs.clientId,
        value: 0,
        maxHr: 185,
        age: 30,
        calories: 0,
      }
      hrmDataStore.save(newClient)
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

      // CRITICAL: Do NOT immediately delete clientData.
      // Wait a grace period (e.g., 5 seconds) to allow for page refresh.
      // NOTE: In a high-traffic production environment, this could lead to
      // memory pressure if many clients disconnect and don't reconnect.
      // A more robust solution might involve a separate cleanup process
      // or a maximum number of inactive sessions.
      const timer = setTimeout(() => {
        // Only cleanup if the client has not reconnected.
        // We verify this by checking if the socket associated with the clientId is the one that just closed.
        // If they are different, it means a new connection has been established.
        if (clientSockets.get(clientId) === extWs) {
          cleanupClientSession(clientId)
        } else {
          // If the client has reconnected, we can safely remove the timer without taking further action.
          clientCleanupTimers.delete(clientId)
          logger.info(
            { clientId },
            'Client reconnected before cleanup timer expired. Timer cleared.'
          )
        }
      }, env.WEBSOCKET_GRACE_PERIOD_MS)

      clientCleanupTimers.set(clientId, timer)
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
  hrmDataStore.clear()
  clientSessionState.clear()
}

const broadcastState = () => {
  broadcast(
    wsServerInstance,
    {
      type: 'HRM_UPDATE',
      payload: hrmDataStore.findAll(),
    },
    'socketManager.broadcastState'
  )
}

const handleIncomingMessage = (
  ws: ExtWebSocket,
  messageString: string,
  clientId: string
) => {
  ws.isAlive = true
  try {
    const parsedJson = JSON.parse(messageString)
    const message = ClientCommandMessageSchema.parse(parsedJson)

    switch (message.type) {
      case 'PING': {
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
          hrmData: hrmDataStore.findAll(),
        }
        const initialStateMessage: ServerMessage = {
          type: 'INITIAL_STATE',
          payload: payload,
        }
        sendWebSocketMessage(ws, initialStateMessage, 'socketManager.GET_STATE')
        break
      }
      case 'HRM_METADATA_UPDATE': {
        const existingData = hrmDataStore.findById(clientId)
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

          hrmDataStore.save({ ...existingData, ...updateData })
        }
        broadcastState()
        break
      }
      case 'HRM_INPUT': {
        const existingData = hrmDataStore.findById(clientId)
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
          hrmDataStore.save({
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
