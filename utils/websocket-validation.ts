import logger from './logger'
import { ServerMessage } from '../types/websocket'

/**
 * Type guard for ServerMessage based on the shape of the data.
 */
function isServerMessage(
  message: unknown
): message is { type: string; payload?: unknown } {
  return (
    typeof message === 'object' &&
    message !== null &&
    'type' in message &&
    typeof (message as { type: unknown }).type === 'string'
  )
}

/**
 * Validates the payload of critical WebSocket messages to ensure runtime safety.
 * Returns true if the message is valid, false otherwise.
 * Logs a warning if the message is invalid.
 */
export const validateWebSocketMessage = (
  message: unknown
): message is ServerMessage => {
  if (!isServerMessage(message)) {
    return false
  }

  if (message.type === 'HRM_UPDATE') {
    if (!Array.isArray(message.payload)) {
      logger.warn('[WebSocketContext] Invalid HRM_UPDATE payload', message)
      return false
    }
  } else if (message.type === 'DEVICE_OFFLINE') {
    if (
      !message.payload ||
      typeof message.payload !== 'object' ||
      !('deviceId' in message.payload) ||
      typeof (message.payload as { deviceId: unknown }).deviceId !== 'string'
    ) {
      logger.warn('[WebSocketContext] Invalid DEVICE_OFFLINE payload', message)
      return false
    }
  }

  return true
}
