// lib/websocket/connectionTracker.ts
import { IncomingMessage } from 'http'
import { Socket } from 'net'
import { env } from '../env.js'

const wsConnections = new Map<string, number>()

export const handleConnectionLimit = (
  req: IncomingMessage,
  socket: Socket
): boolean => {
  // Skip checks in test environment
  if (env.NODE_ENV === 'test') return true

  const ip =
    (req.headers['x-forwarded-for'] as string)?.split(',').shift()?.trim() ||
    req.socket.remoteAddress

  // If the IP cannot be determined, allow the connection. This maintains
  // the original behavior from when this logic was in server.ts.
  if (!ip) return true

  const count = wsConnections.get(ip) || 0
  if (count >= env.WS_MAX_CONNECTIONS) {
    socket.write('HTTP/1.1 429 Too Many Requests\r\n\r\n')
    socket.destroy()
    return false
  }

  wsConnections.set(ip, count + 1)

  socket.on('close', () => {
    const currentCount = wsConnections.get(ip) || 0
    if (currentCount > 0) {
      wsConnections.set(ip, currentCount - 1)
    }
  })

  return true
}

// Exported for testing purposes only
export const _private = {
  wsConnections,
  resetWsConnections: () => {
    wsConnections.clear()
  },
}
