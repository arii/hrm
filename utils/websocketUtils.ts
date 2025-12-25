// File: utils/websocketUtils.ts (New)
/**
 * @internal
 * Provides standardized, type-safe utilities for sending and broadcasting
 * WebSocket messages, ensuring all outgoing data conforms to the
 * canonical `ServerMessage` types. These functions are intended for
 * internal server use only.
 */
import { WebSocket, Server as WebSocketServer } from 'ws'
import { ExtWebSocket, ServerMessage } from '../types/websocket.js'
import logger from './logger.js'

const DEFAULT_WATCHDOG_INTERVAL = 30000
const MIN_WATCHDOG_INTERVAL = 1000
const MAX_WATCHDOG_INTERVAL = 60000

/**
 * Sends a typed WebSocket message to a single client. This is the preferred
 * method for direct-to-client communication.
 *
 * @param ws The WebSocket client instance to send the message to.
 * @param message The `ServerMessage` object to send.
 * @param origin Optional identifier of the calling service for contextual logging.
 */
export const sendWebSocketMessage = (
  ws: WebSocket,
  message: ServerMessage,
  origin?: string
): void => {
  const extWs = ws as ExtWebSocket
  if (extWs.readyState !== WebSocket.OPEN) {
    logger.warn(
      { clientId: extWs.clientId, origin }, // Assuming clientId is attached
      'Attempted to send message to a non-open WebSocket.'
    )
    return
  }
  try {
    extWs.send(JSON.stringify(message))
  } catch (error) {
    logger.error(
      {
        clientId: extWs.clientId,
        error,
        origin,
      },
      'Failed to send WebSocket message.'
    )
  }
}

/**
 * Broadcasts a typed WebSocket message to all connected and open clients.
 * This is the preferred method for server-wide state updates.
 *
 * @param wss The WebSocketServer instance.
 * @param message The `ServerMessage` object to broadcast.
 * @param origin Optional identifier of the calling service for contextual logging.
 */
export const broadcast = (
  wss: WebSocketServer,
  message: ServerMessage,
  origin?: string
): void => {
  const messageString = JSON.stringify(message)
  wss.clients.forEach((client) => {
    const extClient = client as ExtWebSocket
    if (extClient.readyState === WebSocket.OPEN) {
      try {
        extClient.send(messageString)
      } catch (error) {
        logger.error(
          {
            clientId: extClient.clientId,
            error,
            origin,
          },
          'Failed to broadcast WebSocket message to a client.'
        )
      }
    }
  })
}

/**
 * Manages the health of WebSocket connections by periodically sending pings
 * and terminating unresponsive clients.
 */
export class ConnectionMonitor {
  private wss: WebSocketServer
  private intervalId: NodeJS.Timeout | null = null
  private watchdogInterval: number

  /**
   * @param wss The WebSocketServer instance to monitor.
   * @param watchdogInterval The interval in milliseconds to check for stale connections.
   */
  constructor(wss: WebSocketServer, watchdogInterval?: number) {
    this.wss = wss

    let interval =
      watchdogInterval ??
      parseInt(
        process.env.WEBSOCKET_WATCHDOG_INTERVAL ||
          `${DEFAULT_WATCHDOG_INTERVAL}`,
        10
      )

    if (
      !Number.isInteger(interval) ||
      interval < MIN_WATCHDOG_INTERVAL ||
      interval > MAX_WATCHDOG_INTERVAL
    ) {
      logger.warn(
        {
          providedInterval: interval,
          min: MIN_WATCHDOG_INTERVAL,
          max: MAX_WATCHDOG_INTERVAL,
        },
        `Invalid WEBSOCKET_WATCHDOG_INTERVAL. Falling back to default of ${DEFAULT_WATCHDOG_INTERVAL}ms.`
      )
      interval = DEFAULT_WATCHDOG_INTERVAL
    }
    this.watchdogInterval = interval
  }

  /**
   * Starts the connection monitoring process.
   */
  public start(): void {
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
            'Terminating stale WebSocket connection due to no pong response.'
          )
          return extWs.terminate()
        }

        extWs.isAlive = false
        extWs.ping()
      })
    }, this.watchdogInterval)

    logger.info(
      `ConnectionMonitor started with a ${this.watchdogInterval}ms interval.`
    )
  }

  /**
   * Stops the connection monitoring process.
   */
  public stop(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId)
      this.intervalId = null
      logger.info('ConnectionMonitor stopped.')
    }
  }
}
