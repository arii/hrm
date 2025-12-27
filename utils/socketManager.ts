// File: utils/socketManager.ts (WebSocket Manager - Typed)
/**
 * WebSocket Manager (Typed): Handles client connections, routes commands, and broadcasts state.
 */
import { WebSocket, Server as WebSocketServer } from 'ws'
import { z } from 'zod' // Import z from zod
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

// Define service instances to be managed
// New: Define a function to get the state snapshot
let getUnifiedStateSnapshot: () => StateSnapshot
// Store WebSocket server reference for command relay
let wsServerInstance: WebSocketServer
let connectionMonitor: ConnectionMonitor
let services: AppServices
let calorieUpdateInterval: NodeJS.Timeout | undefined

const hrmDataRepository = new HrmDataRepository()
// Track internal state for calculations (not sent to client)
const clientSessionState = new Map<
  string,
  { lastUpdate: number; hrSamples: number[] }
>()

const CLIENT_DEFAULTS = {
  maxHr: 185,
  age: 30,
}

const updateCaloriesForClient = (clientId: string): boolean => {
  const session = clientSessionState.get(clientId)
  const clientData = hrmDataRepository.findById(clientId)

  if (!session || !clientData || session.hrSamples.length === 0) {
    return false
  }

  const now = Date.now()
  const avgHr =
    session.hrSamples.reduce((sum, val) => sum + val, 0) /
    session.hrSamples.length

  let caloriesUpdated = false
  if (avgHr > 30) {
    try {
      const durationMinutes = (now - session.lastUpdate) / 1000 / 60
      // Prevent calculating for excessively long durations if the system clock changes.
      if (durationMinutes > 0 && durationMinutes < 5) {
        const caloriesBurned = estimateCaloriesBurned({
          heartRate: avgHr,
          age: clientData.age ?? 30,
          weightKg: clientData.weightKg ?? CALORIE_DEFAULTS.WEIGHT_KG,
          durationMinutes: durationMinutes,
        })

        if (caloriesBurned > 0) {
          const currentTotal = clientData.totalCalories ?? 0
          hrmDataRepository.save({
            ...clientData,
            totalCalories:
              Math.round((currentTotal + caloriesBurned) * 10) / 10,
          })
          caloriesUpdated = true
        }
      }
    } catch (error) {
      logger.error({ clientId, error }, 'Failed to estimate calories burned')
    }
  }

  // Reset session state for the next interval
  session.hrSamples = []
  session.lastUpdate = now

  return caloriesUpdated
}

const updateCaloriesForAllClients = () => {
  let needsBroadcast = false
  hrmDataRepository.findAll().forEach((client) => {
    if (updateCaloriesForClient(client.clientId)) {
      needsBroadcast = true
    }
  })

  if (needsBroadcast) {
    broadcastState()
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

  if (!calorieUpdateInterval) {
    calorieUpdateInterval = setInterval(updateCaloriesForAllClients, 15000) // 15-second interval
  }

  wss.on('connection', (ws: WebSocket) => {
    const extWs = ws as ExtWebSocket
    extWs.isAlive = true
    extWs.on('pong', () => {
      extWs.isAlive = true
    })

    extWs.clientId = `user-${Math.random().toString(36).substring(2, 9)}`
    logger.info({ clientId: extWs.clientId }, 'WebSocket client connected')

    // Initialize new client
    const newClient: HrmStreamData = {
      clientId: extWs.clientId,
      value: 0,
      maxHr: CLIENT_DEFAULTS.maxHr,
      age: CLIENT_DEFAULTS.age,
      totalCalories: 0,
    }
    hrmDataRepository.save(newClient)
    clientSessionState.set(extWs.clientId, {
      lastUpdate: Date.now(),
      hrSamples: [],
    })

    extWs.on('message', (message) => {
      handleIncomingMessage(extWs, message.toString(), extWs.clientId)
    })

    extWs.on('close', () => {
      logger.info({ clientId: extWs.clientId }, 'WebSocket client disconnected')
      hrmDataRepository.deleteById(extWs.clientId)
      clientSessionState.delete(extWs.clientId)
      broadcastState()
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
  if (calorieUpdateInterval) {
    clearInterval(calorieUpdateInterval)
    calorieUpdateInterval = undefined
  }
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
        const currentHr = message.data.value

        if (existingData && sessionState && currentHr && currentHr > 0) {
          // Store the current heart rate sample for the periodic calculation.
          sessionState.hrSamples.push(currentHr)
          // Update the immediate HR value for real-time display.
          hrmDataRepository.save({
            ...existingData,
            value: currentHr,
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
