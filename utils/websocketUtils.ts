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
import { env } from '../lib/env.js'
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
 * Monitors WebSocket connections, terminates stale ones, and performs periodic heartbeats.
 * It uses `WEBSOCKET_PING_INTERVAL_MS` to send pings and `WEBSOCKET_PING_TIMEOUT_MS`
 * to terminate connections if a pong is not received.
 */
/**
 * Manages the lifecycle of WebSocket connections by periodically sending `ping`
 * messages and expecting `pong` responses.
 *
 * This class implements a heartbeat mechanism to detect and terminate stale or
 * unresponsive connections. It is particularly useful for environments where
 * connections may be silently dropped by intermediaries (like load balancers)
 * or where clients (like throttled browser tabs) may become unresponsive.
 *
 * For each client, a termination timeout is set after a ping is sent. If a
 * `pong` is received before the timeout expires, the timeout is cleared, and the
 * connection is considered active. If the timeout expires, the connection is
 * terminated.
 */
export class ConnectionMonitor {
  private wss: WebSocketServer
  private pingInterval: number
  private pingTimeout: number
  private intervalId: NodeJS.Timeout | null = null

  constructor(
    wss: WebSocketServer,
    options: { pingInterval: number; pingTimeout: number } = {
      pingInterval: env.WEBSOCKET_PING_INTERVAL_MS,
      pingTimeout: env.WEBSOCKET_PING_TIMEOUT_MS,
    }
  ) {
    this.wss = wss
    this.pingInterval = options.pingInterval
    this.pingTimeout = options.pingTimeout

    if (this.pingTimeout <= this.pingInterval) {
      const newPingTimeout = this.pingInterval + 5000
      logger.warn(
        {
          pingInterval: this.pingInterval,
          pingTimeout: this.pingTimeout,
          adjustedTimeout: newPingTimeout,
        },
        'WEBSOCKET_PING_TIMEOUT_MS should be greater than WEBSOCKET_PING_INTERVAL_MS. Adjusting timeout to safe value.'
      )
      this.pingTimeout = newPingTimeout
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

        // Set a timeout to terminate the connection if a PONG is not received.
        // The 'pong' event listener in socketManager clears this timeout.
        extWs.terminationTimeout = setTimeout(() => {
          logger.warn(
            { clientId: extWs.clientId },
            'Terminating stale WebSocket connection due to ping timeout.'
          )
          extWs.terminationReason = 'ping_timeout'
          extWs.terminate()
        }, this.pingTimeout)

        // Send the ping. The client's response ('pong') will clear the timeout.
        extWs.ping(() => {
          /* no-op */
        })
      })
    }, this.pingInterval)

    logger.info(
      {
        pingInterval: this.pingInterval,
        pingTimeout: this.pingTimeout,
      },
      'ConnectionMonitor started.'
    )
  }

  stop(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId)
      this.intervalId = null

      // Clean up any pending termination timeouts
      this.wss.clients.forEach((ws) => {
        const extWs = ws as ExtWebSocket
        if (extWs.terminationTimeout) {
          clearTimeout(extWs.terminationTimeout)
        }
      })
      logger.info('ConnectionMonitor stopped.')
    }
  }
}
