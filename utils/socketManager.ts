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
import { CALORIE_DEFAULTS, MIN_HR_FOR_CALORIES } from './constants.js'
import {
  broadcast,
  sendWebSocketMessage,
  ConnectionMonitor,
} from './websocketUtils.js'
import logger from './logger.js'
import { estimateCaloriesPerMinute } from '../lib/calorie-estimation.js'
import { HrmDataRepository } from '../lib/repositories/HrmDataRepository.js'
import { AppServices } from '../lib/services.js'
import { env } from '../lib/env.js'

// Define service instances to be managed
let getUnifiedStateSnapshot: () => StateSnapshot
let wsServerInstance: WebSocketServer
let connectionMonitor: ConnectionMonitor
let services: AppServices

// State Management
export const hrmDataRepository = new HrmDataRepository()
const MAX_CLIENTS = env.MAX_WS_CLIENTS // Prevent memory exhaustion

const clientSockets = new Map<string, WebSocket>()
const clientSessionState = new Map<
  string,
  { lastUpdate: number; accumulatedCalories: number }
>()

/**
 * Safely parses the WebSocket request URL to extract search parameters.
 * @param req - The incoming HTTP request from the WebSocket upgrade.
 * @returns URLSearchParams object, which will be empty if parsing fails.
 */
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
    if (clientSockets.size >= MAX_CLIENTS) {
      logger.warn('Max connections reached. Rejecting client.')
      ws.close(1013, 'Try again later')
      return
    }
    const extWs = ws as ExtWebSocket
    extWs.isAlive = true
    extWs.on('pong', () => {
      extWs.isAlive = true
    })

    const searchParams = getRequestParams(req)
    const requestedId = searchParams.get('clientId')

    const isValidId = requestedId && /^[0-9a-f-]{36}$/i.test(requestedId)
    if (requestedId && !isValidId) {
      logger.warn(
        { requestedId },
        'Invalid clientId received. Generating new one.'
      )
    }
    const clientId = isValidId ? requestedId : randomUUID()
    extWs.clientId = clientId

    logger.info(
      { clientId, isReconnection: !!isValidId },
      'WebSocket client connected'
    )

    if (clientSockets.has(clientId)) {
      const oldWs = clientSockets.get(clientId)
      if (oldWs && oldWs !== ws && oldWs.readyState === WebSocket.OPEN) {
        logger.warn({ clientId }, 'Terminating zombie connection')
        oldWs.terminate()
      }
    }
    clientSockets.set(clientId, ws)

    if (!hrmDataRepository.findById(clientId)) {
      logger.info({ clientId }, 'Initializing new client session')
      const newClient: HrmStreamData = {
        clientId: clientId,
        value: 0,
        maxHr: 185,
        age: 30,
        calories: 0,
        weightKg: CALORIE_DEFAULTS.WEIGHT_KG,
      }
      hrmDataRepository.save(newClient)
      clientSessionState.set(clientId, {
        lastUpdate: Date.now(),
        accumulatedCalories: 0,
      })
    } else {
      logger.info({ clientId }, 'Restored existing client session')
      // Restore accumulated calories from repository
      const existingData = hrmDataRepository.findById(clientId)
      clientSessionState.set(clientId, {
        lastUpdate: Date.now(),
        accumulatedCalories: existingData?.calories ?? 0,
      })
    }

    extWs.on('message', (message) => {
      handleIncomingMessage(extWs, message.toString(), clientId)
    })

    extWs.on('close', () => {
      logger.info({ clientId }, 'WebSocket client disconnected')
      // No timeout needed, data is persisted
      const existingData = hrmDataRepository.findById(clientId)
      if (existingData) {
        const sessionState = clientSessionState.get(clientId)
        if (sessionState) {
          hrmDataRepository.save({
            ...existingData,
            calories: sessionState.accumulatedCalories,
          })
        }
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
      case 'PING':
        break
      case 'REGISTER_CLIENT':
        ws.clientType = (message as ClientRegistrationMessage).role
        logger.info(
          { clientId, clientType: ws.clientType },
          'Client registered'
        )
        break
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

          const currentHr = message.data.value ?? existingData.value
          const currentAge = existingData.age ?? 30
          // Prioritize incoming weight, but fall back to stored or default weight.
          // This is a fallback used when client-specific weight data is unavailable.
          const calculatedWeight =
            message.data.weight ??
            existingData.weightKg ??
            CALORIE_DEFAULTS.WEIGHT_KG

          if (
            currentHr > MIN_HR_FOR_CALORIES &&
            dtMinutes > 0 &&
            dtMinutes < 5
          ) {
            const caloriesPerMinute = estimateCaloriesPerMinute({
              heartRate: currentHr,
              age: currentAge,
              weightKg: calculatedWeight,
            })
            sessionState.accumulatedCalories += caloriesPerMinute * dtMinutes
          }

          hrmDataRepository.save({
            ...existingData,
            value: message.data.value ?? existingData.value,
            calories: Math.round(sessionState.accumulatedCalories * 10) / 10,
            weightKg: calculatedWeight,
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

export { initSocketManager, getRequestParams }
