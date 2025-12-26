// File: utils/socketManager.ts (WebSocket Manager - Typed)
/**
 * WebSocket Manager (Typed): Handles client connections, routes commands, and broadcasts state.
 */
import { WebSocket, Server as WebSocketServer } from 'ws'
import { z } from 'zod'
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
import { serviceContainer } from '../lib/serviceContainer.js'
import { hrmDataService } from '../services/hrmDataService.js'
import { getHrZoneProps } from './visualization.js'

let getUnifiedStateSnapshot: () => StateSnapshot
let wsServerInstance: WebSocketServer
let connectionMonitor: ConnectionMonitor

interface ClientConnectionState {
  sessionId: string
  userName: string
  age: number
  maxHr: number
  lastUpdate: number
  accumulatedCalories: number
  totalBpm: number
  measurementCount: number
  currentBpm: number
}

const clientConnections = new Map<string, ClientConnectionState>()

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

    const sessiondId = hrmDataService.startSession({
      userName: extWs.clientId,
    })

    extWs.sessionId = sessiondId

    clientConnections.set(extWs.clientId, {
      sessionId: sessiondId,
      userName: extWs.clientId,
      age: 30,
      maxHr: 185,
      lastUpdate: Date.now(),
      accumulatedCalories: 0,
      totalBpm: 0,
      measurementCount: 0,
      currentBpm: 0,
    })

    extWs.on('message', (message) => {
      handleIncomingMessage(extWs, message.toString(), extWs.clientId)
    })

    extWs.on('close', () => {
      logger.info({ clientId: extWs.clientId }, 'WebSocket client disconnected')
      const sessionState = clientConnections.get(extWs.clientId)
      if (sessionState) {
        const avgBpm =
          sessionState.measurementCount > 0
            ? Math.round(sessionState.totalBpm / sessionState.measurementCount)
            : 0
        hrmDataService.endSession(
          sessionState.sessionId,
          Date.now(),
          avgBpm,
          Math.round(sessionState.accumulatedCalories)
        )
      }
      clientConnections.delete(extWs.clientId)
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
  clientConnections.clear()
}

const broadcastState = () => {
  const payload: HrmStreamData[] = Array.from(clientConnections.values()).map(
    (state) => ({
      clientId: state.userName,
      value: state.currentBpm,
      maxHr: state.maxHr,
      age: state.age,
      calories: Math.round(state.accumulatedCalories * 10) / 10,
    })
  )

  broadcast(
    wsServerInstance,
    {
      type: 'HRM_UPDATE',
      payload: payload,
    },
    'socketManager.broadcastState'
  )
}

const handleIncomingMessage = (
  ws: ExtWebSocket,
  messageString: string,
  clientId: string
) => {
  try {
    const parsedJson = JSON.parse(messageString)
    const message = ClientCommandMessageSchema.parse(parsedJson)
    const sessionState = clientConnections.get(clientId)

    if (!sessionState && message.type !== 'GET_STATE') {
      logger.warn({ clientId }, 'Received message for non-existent session.')
      return
    }

    switch (message.type) {
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
          hrmData: [], // Cleared as it's no longer stored in memory
        }
        const initialStateMessage: ServerMessage = {
          type: 'INITIAL_STATE',
          payload: payload,
        }
        sendWebSocketMessage(ws, initialStateMessage, 'socketManager.GET_STATE')
        break
      }
      case 'HRM_METADATA_UPDATE': {
        if (sessionState) {
          sessionState.age = message.data.age ?? sessionState.age
          sessionState.maxHr = message.data.maxHr ?? sessionState.maxHr
          sessionState.userName =
            message.data.userName ?? sessionState.userName
          if (message.data.userName) {
            hrmDataService.updateSessionMetadata(
              sessionState.sessionId,
              message.data.userName
            )
          }
        }
        broadcastState()
        break
      }
      case 'HRM_INPUT': {
        if (sessionState && message.data.value) {
          const now = Date.now()
          const dtMinutes = (now - sessionState.lastUpdate) / 1000 / 60
          sessionState.lastUpdate = now

          if (dtMinutes > 0 && dtMinutes < 5) {
            const caloriesBurned = estimateCaloriesBurned({
              heartRate: message.data.value,
              age: sessionState.age,
              weightKg: CALORIE_DEFAULTS.WEIGHT_KG,
              durationMinutes: dtMinutes,
            })
            sessionState.accumulatedCalories += caloriesBurned
          }
          sessionState.totalBpm += message.data.value
          sessionState.measurementCount++
          sessionState.currentBpm = message.data.value

          const zone = getHrZoneProps(message.data.value, sessionState.maxHr)

          hrmDataService.logMeasurement(
            {
              timestamp: now,
              bpm: message.data.value,
              caloriesAccumulated: sessionState.accumulatedCalories,
              zoneLabel: zone.zone,
            },
            sessionState.sessionId
          )
        }
        broadcastState()
        break
      }

      case 'TIMER_COMMAND':
        serviceContainer.get('tabataService').handleCommand(message.command)
        break

      // ... other cases remain the same
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
