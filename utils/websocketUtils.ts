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
import { redisClient } from '../lib/redis.js'

const BROADCAST_CHANNEL = 'websocket-broadcast';
const redisSubscriber = redisClient.duplicate();

/**
 * Initializes the Redis-backed broadcaster for a given WebSocket server instance.
 * Each server instance will subscribe to the Redis channel and broadcast messages
 * to its own set of connected clients.
 *
 * @param wss The WebSocketServer instance for this server node.
 */
export const initBroadcaster = (wss: WebSocketServer): void => {
  redisSubscriber.subscribe(BROADCAST_CHANNEL, (err) => {
    if (err) {
      logger.error({ err }, 'Failed to subscribe to Redis broadcast channel');
      process.exit(1);
    } else {
      logger.info({ channel: BROADCAST_CHANNEL }, 'Subscribed to Redis broadcast channel');
    }
  });

  redisSubscriber.on('message', (channel, message) => {
    if (channel === BROADCAST_CHANNEL) {
      try {
        // This is the "local" broadcast to clients connected to this specific instance.
        wss.clients.forEach((client) => {
          const extClient = client as ExtWebSocket;
          if (extClient.readyState === WebSocket.OPEN) {
            try {
              extClient.send(message); // message is already a string
            } catch (error) {
              logger.error(
                {
                  clientId: extClient.clientId,
                  error,
                  origin: 'redis-broadcast-listener',
                },
                'Failed to broadcast WebSocket message to a client from Redis.'
              );
            }
          }
        });
      } catch (error) {
        logger.error({ error, message }, 'Failed to parse or broadcast message from Redis');
      }
    }
  });
};


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
 * Broadcasts a typed WebSocket message to all connected clients across all server instances
 * by publishing it to a Redis channel.
 *
 * @param message The `ServerMessage` object to broadcast.
 * @param origin Optional identifier of the calling service for contextual logging.
 */
export const broadcast = (
  message: ServerMessage,
  origin?: string
): void => {
    try {
        const messageString = JSON.stringify(message);
        redisClient.publish(BROADCAST_CHANNEL, messageString);
      } catch (error) {
        logger.error({ error, origin }, 'Failed to publish message to Redis');
      }
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
        logger.warn(
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
      logger.warn(
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
        extWs.ping(() => {
          /* no-op */
        })
      })
    }, this.watchdogInterval)

    logger.info(
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
      logger.info('ConnectionMonitor stopped.')
    }
  }
}
