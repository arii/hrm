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
    console.warn(
      { clientId: extWs.clientId, origin }, // Assuming clientId is attached
      'Attempted to send message to a non-open WebSocket.'
    )
    return
  }
  try {
    extWs.send(JSON.stringify(message))
  } catch (error) {
    console.error(
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
        console.error(
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
 */
export class ConnectionMonitor {
  private wss: WebSocketServer
  private watchdogInterval: number
  private intervalId: NodeJS.Timeout | null = null

  /**
   * @param wss The WebSocketServer instance to monitor.
   * @param watchdogInterval The interval in milliseconds to check for stale connections.
   */
  constructor(wss: WebSocketServer, watchdogInterval?: number) {
    this.wss = wss

    let interval = watchdogInterval

    // If no interval is provided via argument, get it from the environment.
    if (interval === undefined) {
      const envValue = process.env.WEBSOCKET_WATCHDOG_INTERVAL
      const parsedValue = parseInt(envValue || '30000', 10)

      if (envValue && (isNaN(parsedValue) || parsedValue <= 0)) {
        console.warn(
          {
            provided: envValue,
            fallback: 30000,
          },
          'Invalid WEBSOCKET_WATCHDOG_INTERVAL. Using fallback.'
        )
        interval = 30000
      } else {
        interval = parsedValue
      }
    }

    // Final validation for any source.
    if (interval <= 0) {
      console.warn(
        {
          provided: interval,
          fallback: 30000,
        },
        'Watchdog interval must be a positive integer. Using fallback.'
      )
      this.watchdogInterval = 30000
    } else {
      this.watchdogInterval = interval
    }
  }

  /**
   * Starts the connection monitoring process.
   */
  start(): void {
    if (this.intervalId) {
      console.warn('ConnectionMonitor is already running.')
      return
    }

    this.intervalId = setInterval(() => {
      this.wss.clients.forEach((ws) => {
        const extWs = ws as ExtWebSocket

        if (extWs.isAlive === false) {
          console.warn(
            { clientId: extWs.clientId },
            'Terminating stale WebSocket connection due to missed heartbeat.'
          )
          return extWs.terminate()
        }

        extWs.isAlive = false
        extWs.ping(() => {
          /* no-op */
        })
      })
    }, this.watchdogInterval)

    console.info(
      { interval: this.watchdogInterval },
      'ConnectionMonitor started.'
    )
  }

  /**
   * Stops the connection monitoring process.
   */
  stop(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId)
      this.intervalId = null
      console.info('ConnectionMonitor stopped.')
    }
  }
}
