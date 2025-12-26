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
import { serviceContainer } from '../lib/serviceContainer.js'
import { HrmDataRepository } from '../lib/repositories/HrmDataRepository.js'

// Define service instances to be managed
// New: Define a function to get the state snapshot
let getUnifiedStateSnapshot: () => StateSnapshot
// Store WebSocket server reference for command relay
let wsServerInstance: WebSocketServer
let connectionMonitor: ConnectionMonitor

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
  getSnapshot: () => StateSnapshot
) => {
  wsServerInstance = wss
  getUnifiedStateSnapshot = getSnapshot
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
        serviceContainer.get('tabataService').handleCommand(message.command)
        break

      case 'SET_MODE':
        serviceContainer.get('tabataService').setMode(message.mode)
        break

      case 'TIMER_CONFIG':
        serviceContainer.get('tabataService').setConfig({
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

        const spotifyService = serviceContainer.get('spotifyService')
        const params: {
          deviceId?: string
          volume?: number
          playlistUri?: string
        } = {}
        if (commandMsg.deviceId) params.deviceId = commandMsg.deviceId
        if (commandMsg.volume !== undefined) params.volume = commandMsg.volume
        if (commandMsg.playlistUri) params.playlistUri = commandMsg.playlistUri

        spotifyService.handleCommand(commandMsg.command, params)
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
