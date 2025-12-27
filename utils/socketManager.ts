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

const hrmDataRepository = new HrmDataRepository()
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
      maxHr: 185,
      age: 30,
      calories: 0, // Initialize to 0
      isConnected: true,
    }
    hrmDataRepository.save(newClient)
    clientSessionState.set(extWs.clientId, {
      lastUpdate: Date.now(),
      accumulatedCalories: 0,
    })

    extWs.on('message', (message) => {
      handleIncomingMessage(extWs, message.toString(), extWs.clientId)
    })

    extWs.on('close', () => {
      logger.info({ clientId: extWs.clientId }, 'WebSocket client disconnected')
      hrmDataRepository.updateConnectionStatus(extWs.clientId, false)
      // We don't delete the clientSessionState so that the calorie count can be restored on reconnect
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

function handleIdentifyClient(
  ws: ExtWebSocket,
  oldId: string,
  newId: string
): void {
  if (oldId === newId) return

  const existingData = hrmDataRepository.findById(oldId)
  const sessionData = clientSessionState.get(oldId)

  if (existingData) {
    const reconnectedClientData: HrmStreamData = {
      ...existingData,
      clientId: newId,
      isConnected: true,
    }
    hrmDataRepository.deleteById(oldId)
    hrmDataRepository.save(reconnectedClientData)
    ws.clientId = newId
  }

  if (sessionData) {
    clientSessionState.set(newId, sessionData)
    clientSessionState.delete(oldId)
  }

  logger.info({ clientId: newId }, 'Client identified and data re-associated')
  broadcastState()
}

function handleHrmInput(
  clientId: string,
  data: { value: number | null }
): void {
  const existingData = hrmDataRepository.findById(clientId)
  const sessionState = clientSessionState.get(clientId)

  if (existingData && sessionState) {
    const now = Date.now()
    const dtMinutes = (now - sessionState.lastUpdate) / 1000 / 60
    sessionState.lastUpdate = now

    let currentAccumulated = sessionState.accumulatedCalories
    const currentHr = data.value ?? existingData.value
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
      value: currentHr,
      calories: Math.round(currentAccumulated * 10) / 10,
    })
  }
  broadcastState()
}

function handleSpotifyCommand(
  clientId: string,
  commandMsg: SpotifyCommandMessage
): void {
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
  const { deviceId, volume, playlistUri, contextUri } =
    commandMsg as SpotifyCommandMessage
  const params: {
    deviceId?: string
    volume?: number
    playlistUri?: string
    contextUri?: string
  } = {}
  if (deviceId) params.deviceId = deviceId
  if (volume) params.volume = volume
  if (playlistUri) params.playlistUri = playlistUri
  if (contextUri) params.contextUri = contextUri
  spotifyService.handleCommand(commandMsg.command, params)
}

const handleIncomingMessage = (
  ws: ExtWebSocket,
  messageString: string,
  clientId: string
) => {
  try {
    const message = ClientCommandMessageSchema.parse(JSON.parse(messageString))

    switch (message.type) {
      case 'IDENTIFY_CLIENT':
        handleIdentifyClient(ws, clientId, message.clientId)
        break
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
        sendWebSocketMessage(
          ws,
          { type: 'INITIAL_STATE', payload },
          'socketManager.GET_STATE'
        )
        break
      }
      case 'HRM_METADATA_UPDATE': {
        const existingData = hrmDataRepository.findById(clientId)
        if (existingData) {
          const updateData = Object.fromEntries(
            Object.entries(message.data).filter(([, value]) => value !== null)
          )
          hrmDataRepository.save({ ...existingData, ...updateData })
        }
        broadcastState()
        break
      }
      case 'HRM_INPUT':
        handleHrmInput(clientId, message.data)
        break
      case 'TIMER_COMMAND':
        services.tabataService.handleCommand(message.command)
        break
      case 'SET_MODE':
        services.tabataService.setMode(message.mode)
        break
      case 'TIMER_CONFIG':
        services.tabataService.setConfig(message)
        break
      case 'SPOTIFY_COMMAND':
        handleSpotifyCommand(clientId, message as SpotifyCommandMessage)
        break
      default: {
        const unhandledMessage: never = message
        logger.warn(
          { clientId, type: (unhandledMessage as { type: string }).type },
          'Unknown message type'
        )
      }
    }
  } catch (e) {
    if (e instanceof z.ZodError) {
      logger.error({ clientId, errors: e.issues }, 'Validation failed')
    } else {
      logger.error({ clientId, error: e }, 'Error processing message')
    }
  }
}

export { initSocketManager }
