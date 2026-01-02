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
import {
  broadcast,
  sendWebSocketMessage,
  ConnectionMonitor,
} from './websocketUtils.js'
import logger from './logger.js'
import { HrmDataRepository } from '../lib/repositories/HrmDataRepository.js'
import { AppServices } from '../lib/services.js'
import { env } from '../lib/env.js'

let getUnifiedStateSnapshot: () => StateSnapshot
let wsServerInstance: WebSocketServer
let connectionMonitor: ConnectionMonitor
let services: AppServices

const hrmDataRepository = new HrmDataRepository()
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

const getLogMeta = (
  req: IncomingMessage,
  clientId: string
): Record<string, unknown> => {
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
      const newClient: HrmStreamData = {
        clientId: extWs.clientId,
        value: 0,
        maxHr: 185,
        age: 30,
        calories: 0,
      }
      hrmDataRepository.save(newClient)
    } else {
      logger.info({ clientId }, 'Reconnected with existing session.')
    }

    extWs.on('message', (message) => {
      handleIncomingMessage(extWs, message.toString(), extWs.clientId)
    })

    extWs.on('close', () => {
      logger.info({ clientId: extWs.clientId }, 'WebSocket client disconnected')
      setTimeout(() => {
        if (clientSockets.get(clientId) === extWs) {
          logger.info(
            { clientId: extWs.clientId },
            'Session expired. Deleting data.'
          )
          try {
            hrmDataRepository.deleteById(extWs.clientId)
            broadcastState()
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

export const resetSocketManager = () => {
  hrmDataRepository.clear()
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
        if (existingData) {
          // The client is now the source of truth for smoothed HR and calories.
          // The server simply accepts and broadcasts this data.
          const { value, calories } = message.data
          hrmDataRepository.save({
            ...existingData,
            value: value ?? existingData.value,
            calories: calories ?? existingData.calories,
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
