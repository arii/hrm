//- Basic in-memory WebSocket rate limiter
import type { IncomingMessage } from 'http'
import logger from '../../utils/logger.js'

const connectionAttempts = new Map<
  string,
  { count: number; windowStart: number }
>()
const MAX_ATTEMPTS = 5 // Max connections per window
const TIME_WINDOW_MS = 15 * 60 * 1000 // 15 minutes

export const checkWsRateLimit = (req: IncomingMessage): boolean => {
  if (process.env.TESTING === 'true') {
    return true // Skip limiting in test environment
  }

  const ip = (req.headers['x-forwarded-for'] ||
    req.socket.remoteAddress) as string
  if (!ip) return false // Should not happen, but safeguard

  const now = Date.now()
  const record = connectionAttempts.get(ip)

  if (!record || now - record.windowStart > TIME_WINDOW_MS) {
    // If no record or the record is outside the time window, start a new one
    connectionAttempts.set(ip, { count: 1, windowStart: now })
    return true
  }

  // If the record is within the time window, increment the count
  record.count++
  // NOTE: We do NOT update the windowStart timestamp here. That was the bug.
  if (record.count > MAX_ATTEMPTS) {
    logger.warn({ ip, attempts: record.count }, 'WebSocket rate limit exceeded')
    return false // Block the connection
  }

  return true
}

// Periodically clean up old entries to prevent memory leaks
setInterval(
  () => {
    const now = Date.now()
    for (const [ip, record] of connectionAttempts.entries()) {
      if (now - record.windowStart > TIME_WINDOW_MS) {
        connectionAttempts.delete(ip)
      }
    }
  },
  TIME_WINDOW_MS * 2
)
