// File: utils/socketManager.ts (WebSocket Manager - Typed)
/**
 * WebSocket Manager (Typed): Handles client connections, routes commands, and broadcasts state.
 * Refactored for horizontal scalability using Redis for state and Pub/Sub.
 */
import { WebSocket, Server as WebSocketServer } from 'ws'
import { z } from 'zod'
import { IncomingMessage } from 'http'
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
import { sendWebSocketMessage, ConnectionMonitor } from './websocketUtils.js'
import logger from './logger.js'
import { estimateCaloriesBurned } from '../lib/calorie-estimation.js'
import { RedisHrmDataRepository } from '../lib/repositories/RedisHrmDataRepository.js'
import { RedisClientSessionRepository } from '../lib/repositories/RedisClientSessionRepository.js'
import { AppServices } from '../lib/services.js'
import { env } from '../lib/env.js'
import { RedisPubSubBroadcaster } from '../lib/broadcaster.js'

let getUnifiedStateSnapshot: () => StateSnapshot
let wsServerInstance: WebSocketServer
let connectionMonitor: ConnectionMonitor
let services: AppServices

const hrmDataRepository = new RedisHrmDataRepository()
const clientSessionRepository = new RedisClientSessionRepository()
const broadcaster = new RedisPubSubBroadcaster()
const clientSockets = new Map<string, WebSocket>()

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

  broadcaster.subscribeToHrmData((message: string) => {
    try {
      const parsedMessage: ServerMessage = JSON.parse(message)
      wsServerInstance.clients.forEach((client) => {
        if (client.readyState === WebSocket.OPEN) {
          sendWebSocketMessage(
            client as ExtWebSocket,
            parsedMessage,
            `redis-broadcast:hrm-data`
          )
        }
      })
    } catch (error) {
      logger.error(
        { error, channel: 'hrm-data' },
        'Failed to process message from Redis channel'
      )
    }
  })

  wss.on('connection', async (ws: WebSocket, req: IncomingMessage) => {
    const extWs = ws as ExtWebSocket
    const params = getRequestParams(req)
    const clientId =
      params.get('clientId') ||
      `user-${Math.random().toString(36).substring(2, 9)}`
    extWs.clientId = clientId

    if (clientSockets.has(clientId)) {
      logger.warn(
        { clientId },
        'Existing socket found. Overwriting with new connection.'
      )
    }
    clientSockets.set(clientId, extWs)

    extWs.isAlive = true
    extWs.on('pong', () => {
      extWs.isAlive = true
    })

    logger.info({ clientId: extWs.clientId }, 'WebSocket client connected')

    const existingClient = await hrmDataRepository.findById(clientId)
    if (!existingClient) {
      const newClient: HrmStreamData = {
        clientId: extWs.clientId,
        value: 0,
        maxHr: 185,
        age: 30,
        calories: 0,
      }
      await hrmDataRepository.save(newClient)
      await clientSessionRepository.save(extWs.clientId, {
        lastUpdate: Date.now(),
        accumulatedCalories: 0,
      })
      await broadcastState()
    } else {
      logger.info({ clientId }, 'Reconnected with existing session.')
    }

    extWs.on('message', (message) => {
      handleIncomingMessage(extWs, message.toString(), extWs.clientId).catch(
        (err) => logger.error({ error: err }, 'Error handling incoming message')
      )
    })

    extWs.on('close', () => {
      logger.info({ clientId: extWs.clientId }, 'WebSocket client disconnected')
      setTimeout(async () => {
        if (clientSockets.get(clientId) === extWs) {
          logger.info(
            { clientId: extWs.clientId },
            'Session expired. Deleting data.'
          )
          try {
            await hrmDataRepository.deleteById(extWs.clientId)
            await clientSessionRepository.deleteById(extWs.clientId)
            await broadcastState()
          } catch (err) {
            logger.error(
              { clientId: extWs.clientId, error: err },
              'Error during session cleanup'
            )
          } finally {
            clientSockets.delete(extWs.clientId)
          }
        }
      }, env.WEBSOCKET_GRACE_PERIOD_MS)
    })
  })

  wss.on('close', () => {
    connectionMonitor.stop()
  })
}

export const resetSocketManager = async () => {
  await hrmDataRepository.clear()
  await broadcaster.disconnect()
}

const broadcastState = async () => {
  const payload = await hrmDataRepository.findAll()
  await broadcaster.broadcastHrmData({
    type: 'HRM_UPDATE',
    payload,
  })
}

const handleIncomingMessage = async (
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
        const hrmData = await hrmDataRepository.findAll()
        const payload: InitialStateSnapshotPayload = {
          ...stateSnapshot,
          hrmData,
        }
        const initialStateMessage: ServerMessage = {
          type: 'INITIAL_STATE',
          payload,
        }
        sendWebSocketMessage(ws, initialStateMessage, 'socketManager.GET_STATE')
        break
      }
      case 'HRM_METADATA_UPDATE': {
        const existingData = await hrmDataRepository.findById(clientId)
        if (existingData) {
          const updateData: Partial<HrmStreamData> = Object.fromEntries(
            Object.entries(message.data).filter(([_, value]) => value !== null)
          )
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
          await hrmDataRepository.save({ ...existingData, ...updateData })
        }
        await broadcastState()
        break
      }
      case 'HRM_INPUT': {
        const existingData = await hrmDataRepository.findById(clientId)
        const sessionState = await clientSessionRepository.findById(clientId)
        if (existingData && sessionState) {
          const now = Date.now()
          const dtMinutes = (now - sessionState.lastUpdate) / 1000 / 60
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

          await clientSessionRepository.save(clientId, {
            lastUpdate: now,
            accumulatedCalories: currentAccumulated,
          })

          await hrmDataRepository.save({
            ...existingData,
            value: message.data.value ?? existingData.value,
            calories: Math.round(currentAccumulated * 10) / 10,
          })
        }
        await broadcastState()
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
