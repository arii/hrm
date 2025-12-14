// File: utils/broadcast.ts (Singleton Broadcast Function)
/**
 * Provides a singleton wrapper around the WebSocket server's broadcast function.
 * This allows other services to import and use the broadcaster without needing
 * a direct reference to the WebSocket server instance, preventing circular
 * dependency issues.
 */
import { ServerMessage } from '../types/websocket.js'
import { WebSocket, Server as WebSocketServer } from 'ws'

let wssInstance: WebSocketServer | null = null

/**
 * Initializes the broadcaster with the WebSocket server instance.
 * This should only be called once from the main server entry point.
 * @param wss The WebSocket server instance.
 */
export const initBroadcaster = (wss: WebSocketServer) => {
  if (wssInstance) {
    console.warn('Broadcaster already initialized. Ignoring subsequent calls.')
    return
  }
  wssInstance = wss
  console.log('[Broadcaster] Initialized successfully.')
}

/**
 * Broadcasts a typed server message to all connected WebSocket clients.
 * If the broadcaster has not been initialized, it will log an error and return.
 * @param message The `ServerMessage` to broadcast.
 */
export const broadcast = (message: ServerMessage) => {
  if (!wssInstance) {
    console.error(
      '[Broadcaster] Broadcast called before initialization. Message lost:',
      message
    )
    return
  }

  const messageString = JSON.stringify(message)
  wssInstance.clients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(messageString)
    }
  })
}
