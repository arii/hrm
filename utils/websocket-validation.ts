import logger from './logger'
import { ServerMessage } from '../types/websocket'

/**
 * Validates the payload of critical WebSocket messages to ensure runtime safety.
 * Returns true if the message is valid, false otherwise.
 * Logs a warning if the message is invalid.
 */
export const validateWebSocketMessage = (message: any): message is ServerMessage => {
  if (!message || typeof message !== 'object') {
    return false
  }

  if (message.type === 'HRM_UPDATE') {
    if (!Array.isArray(message.payload)) {
      logger.warn('[WebSocketContext] Invalid HRM_UPDATE payload', message)
      return false
    }
  } else if (message.type === 'DEVICE_OFFLINE') {
    if (!message.payload || typeof message.payload.deviceId !== 'string') {
      logger.warn('[WebSocketContext] Invalid DEVICE_OFFLINE payload', message)
      return false
    }
  }

  return true
}
