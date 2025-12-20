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
import logger from './logger.js'

// Define a custom WebSocket type that includes our application-specific properties
interface ExtWebSocket extends WebSocket {
  clientId: string
}

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
