// File: config/rate-limit.ts
/**
 * Description: Centralized configuration for API rate limiting.
 */
import { Options } from 'express-rate-limit'
import { Request } from 'express'

// Common handler for when a rate limit is exceeded
const limitReachedHandler = (req: Request) => {
  console.warn(
    {
      ip: req.ip,
      path: req.path,
      method: req.method,
    },
    'Rate limit exceeded'
  )
}

// Common key generator
const keyGenerator = (req: Request) => {
  // Use X-Forwarded-For if available (from reverse proxy), else use socket address
  return (
    (req.headers['x-forwarded-for'] as string)?.split(',')[0] ||
    req.socket.remoteAddress ||
    'unknown'
  )
}

interface RateLimitConfig {
  [key: string]: Partial<Options>
}

export const rateLimitConfig: RateLimitConfig = {
  spotify: {
    windowMs: 1 * 60 * 1000, // 1 minute
    max: 30,
    standardHeaders: true,
    legacyHeaders: false,
    message: {
      error: 'Too many requests to Spotify API, please try again later.',
    },
    handler: limitReachedHandler,
    keyGenerator,
  },
  internal: {
    windowMs: 1 * 60 * 1000, // 1 minute
    max: 100,
    standardHeaders: true,
    legacyHeaders: false,
    message: {
      error: 'Too many requests to internal API, please try again later.',
    },
    handler: limitReachedHandler,
    keyGenerator,
  },
  general: {
    windowMs: 1 * 60 * 1000, // 1 minute
    max: 200,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: 'Too many requests, please try again later.' },
    handler: limitReachedHandler,
    keyGenerator,
  },
}
