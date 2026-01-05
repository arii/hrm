// File: utils/socketManager.ts (Refactored)
/**
 * WebSocket Manager: Handles client connections, sessions, and state broadcasts.
 */
import { WebSocket, Server as WebSocketServer } from 'ws'
import { IncomingMessage } from 'http'
import { TLSSocket } from 'tls'
import { StateSnapshot, ExtWebSocket } from '../types/websocket.js'
import { broadcast, ConnectionMonitor } from './websocketUtils.js'
import logger from './logger.js'
import { AppServices } from '../lib/services.js'
import { env } from '../lib/env.js'
import { handleIncomingMessage } from '../lib/messageHandler.js'

let getUnifiedStateSnapshot: () => StateSnapshot
let wsServerInstance: WebSocketServer
let connectionMonitor: ConnectionMonitor
let services: AppServices

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

  const broadcastState = () => {
    broadcast(
      wsServerInstance,
      {
        type: 'HRM_UPDATE',
        payload: services.hrmService.getHrmData(),
      },
      'socketManager.broadcastState'
    )
  }

  wss.on('connection', (ws: WebSocket, req: IncomingMessage) => {
    const extWs = ws as ExtWebSocket
    const params = getRequestParams(req)
    const clientId =
      params.get('clientId') ||
      `[GENERATED]-user-${Math.random().toString(36).substring(2, 9)}`
    extWs.clientId = clientId
    const logMeta = getLogMeta(req, clientId)

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

    services.hrmService.initializeClient(clientId)

    extWs.on('message', (message) => {
      handleIncomingMessage(
        extWs,
        message.toString(),
        extWs.clientId,
        services,
        getUnifiedStateSnapshot,
        wsServerInstance,
        broadcastState
      )
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
            services.hrmService.cleanupClient(extWs.clientId)
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

export { initSocketManager, getRequestParams }
