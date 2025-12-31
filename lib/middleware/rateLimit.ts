// lib/middleware/rateLimit.ts
import rateLimit from 'express-rate-limit'
import { env } from '../env.js'
import { Request, Response, NextFunction } from 'express'

// Helper to generate consistent key generator
export const getKeyGenerator = (req: Request) => {
  return (
    (req.headers['x-forwarded-for'] as string)?.split(',')[0] ||
    req.socket.remoteAddress ||
    'unknown'
  )
}

export const createRateLimiters = () => {
  // Return no-ops if in test environment or strictly not needed
  if (env.NODE_ENV === 'test') {
    return {
      spotifyApiLimiter: (_req: Request, _res: Response, next: NextFunction) =>
        next(),
      internalApiLimiter: (_req: Request, _res: Response, next: NextFunction) =>
        next(),
      generalApiLimiter: (_req: Request, _res: Response, next: NextFunction) =>
        next(),
    }
  }

  const spotifyApiLimiter = rateLimit({
    windowMs: 1 * 60 * 1000, // 1 minute
    max: 30,
    standardHeaders: true,
    legacyHeaders: false,
    keyGenerator: getKeyGenerator,
    message: {
      error: 'Too many requests to Spotify API, please try again later.',
    },
  })

  const internalApiLimiter = rateLimit({
    windowMs: 1 * 60 * 1000,
    max: 100,
    standardHeaders: true,
    legacyHeaders: false,
    keyGenerator: getKeyGenerator,
    message: {
      error: 'Too many requests to internal API, please try again later.',
    },
  })

  const generalApiLimiter = rateLimit({
    windowMs: 1 * 60 * 1000,
    max: 200,
    standardHeaders: true,
    legacyHeaders: false,
    keyGenerator: getKeyGenerator,
    message: { error: 'Too many requests, please try again later.' },
    skip: (req) =>
      req.path.startsWith('/api/spotify') ||
      req.path.startsWith('/api/internal'),
  })

  return { spotifyApiLimiter, internalApiLimiter, generalApiLimiter }
}
