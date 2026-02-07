import logger from './logger'
import { ServerMessage } from '../types/websocket'

/**
 * Validates the payload of critical WebSocket messages to ensure runtime safety.
 * Returns true if the message is valid, false otherwise.
 * Logs a warning if the message is invalid.
 */
export const validateWebSocketMessage = (
  message: unknown
): message is ServerMessage => {
  if (!message || typeof message !== 'object') {
    return false
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const msg = message as any

  if (msg.type === 'HRM_UPDATE') {
    if (!Array.isArray(msg.payload)) {
      logger.warn('[WebSocketContext] Invalid HRM_UPDATE payload', msg)
      return false
    }
  } else if (msg.type === 'DEVICE_OFFLINE') {
    if (!msg.payload || typeof msg.payload.deviceId !== 'string') {
      logger.warn('[WebSocketContext] Invalid DEVICE_OFFLINE payload', msg)
      return false
    }
  }

  return true
}
