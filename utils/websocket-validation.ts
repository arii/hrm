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

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const msg = message as any

  switch (msg.type) {
    case 'HRM_UPDATE':
      if (!Array.isArray(msg.payload)) {
        logger.warn('[WebSocketContext] Invalid HRM_UPDATE payload', msg)
        return false
      }
      return true
    case 'DEVICE_OFFLINE':
      if (
        !msg.payload ||
        typeof msg.payload !== 'object' ||
        !('deviceId' in msg.payload) ||
        typeof msg.payload.deviceId !== 'string'
      ) {
        logger.warn('[WebSocketContext] Invalid DEVICE_OFFLINE payload', msg)
        return false
      }
      return true
    case 'TIMER_UPDATE':
    case 'SPOTIFY_UPDATE':
    case 'ACTIVE_ALERTS_UPDATE':
    case 'SPOTIFY_SERVICE_INIT_UPDATE':
    case 'INITIAL_STATE':
    case 'PONG':
    case 'EXECUTE_SPOTIFY':
      // For now, we assume these are valid if the type matches, or add specific validation if needed
      return true
    default:
      // Unknown message type
      logger.warn('[WebSocketValidation] Unknown message type:', msg.type)
      return false
  }
}
