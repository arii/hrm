// File: utils/websocketUtils.ts
/**
 * @internal
 * Provides standardized, type-safe utilities for sending and broadcasting
 * WebSocket messages.
 */
import { WebSocket, Server as WebSocketServer } from 'ws'
import { ExtWebSocket, ServerMessage } from '../types/websocket.js'
import logger from './logger.js'

/**
 * Sends a typed WebSocket message to a single client.
 */
export const sendWebSocketMessage = (
  ws: WebSocket,
  message: ServerMessage,
  origin?: string
): void => {
  const extWs = ws as ExtWebSocket
  if (extWs.readyState !== WebSocket.OPEN) {
    logger.warn(
      { clientId: extWs.clientId, origin },
      'Attempted to send message to a non-open WebSocket.'
    )
    return
  }
  try {
    extWs.send(JSON.stringify(message))
  } catch (error) {
    logger.error(
      { clientId: extWs.clientId, error, origin },
      'Failed to send WebSocket message.'
    )
  }
}

/**
 * Monitors WebSocket connections, terminates stale ones, and performs periodic heartbeats.
 */
export class ConnectionMonitor {
  private wss: WebSocketServer
  private watchdogInterval: number
  private intervalId: NodeJS.Timeout | null = null

  constructor(wss: WebSocketServer, watchdogInterval?: number) {
    this.wss = wss
    let interval = watchdogInterval
    if (interval === undefined) {
      const envValue = process.env.WEBSOCKET_WATCHDOG_INTERVAL
      const parsedValue = parseInt(envValue || '30000', 10)
      if (envValue && (isNaN(parsedValue) || parsedValue <= 0)) {
        logger.warn(
          { provided: envValue, fallback: 30000 },
          'Invalid WEBSOCKET_WATCHDOG_INTERVAL. Using fallback.'
        )
        interval = 30000
      } else {
        interval = parsedValue
      }
    }
    if (interval <= 0) {
      logger.warn(
        { provided: interval, fallback: 30000 },
        'Watchdog interval must be a positive integer. Using fallback.'
      )
      this.watchdogInterval = 30000
    } else {
      this.watchdogInterval = interval
    }
  }

  start(): void {
    if (this.intervalId) {
      logger.warn('ConnectionMonitor is already running.')
      return
    }
    this.intervalId = setInterval(() => {
      this.wss.clients.forEach((ws) => {
        const extWs = ws as ExtWebSocket
        if (extWs.isAlive === false) {
          logger.warn(
            { clientId: extWs.clientId },
            'Terminating stale WebSocket connection due to missed heartbeat.'
          )
          return extWs.terminate()
        }
        extWs.isAlive = false
        extWs.ping(() => {})
      })
    }, this.watchdogInterval)
    logger.info(
      { interval: this.watchdogInterval },
      'ConnectionMonitor started.'
    )
  }

  stop(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId)
      this.intervalId = null
      logger.info('ConnectionMonitor stopped.')
    }
  }
}
