// File: utils/websocketUtils.ts (New)
/**
 * @internal
 * Provides standardized, type-safe utilities for sending and broadcasting
 * WebSocket messages, ensuring all outgoing data conforms to the
 * canonical `ServerMessage` types. These functions are intended for
 * internal server use only.
 */
import { WebSocket, Server as WebSocketServer } from 'ws'
import { ServerMessage } from '../types/websocket'
import logger from './logger'

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
  if (ws.readyState !== WebSocket.OPEN) {
    logger.warn(
      { clientId: (ws as any).clientId, origin }, // Assuming clientId is attached
      'Attempted to send message to a non-open WebSocket.'
    )
    return
  }
  try {
    ws.send(JSON.stringify(message))
  } catch (error) {
    logger.error(
      {
        clientId: (ws as any).clientId,
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
    if (client.readyState === WebSocket.OPEN) {
      try {
        client.send(messageString)
      } catch (error) {
        logger.error(
          {
            clientId: (client as any).clientId,
            error,
            origin,
          },
          'Failed to broadcast WebSocket message to a client.'
        )
      }
    }
  })
}
