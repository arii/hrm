// File: lib/middleware/rateLimiter.ts
import rateLimit from 'express-rate-limit'
import { Express } from 'express'
import { env } from '../env'

export const setupRateLimiter = (expressApp: Express) => {
  if (env.NODE_ENV !== 'test') {
    const spotifyApiLimiter = rateLimit({
      windowMs: 1 * 60 * 1000, // 1 minute
      max: 30,
      standardHeaders: true,
      legacyHeaders: false,
      keyGenerator: (req) => {
        return (
          (req.headers['x-forwarded-for'] as string)?.split(',')[0] ||
          req.socket.remoteAddress ||
          'unknown'
        )
      },
      message: {
        error: 'Too many requests to Spotify API, please try again later.',
      },
    })

    const internalApiLimiter = rateLimit({
      windowMs: 1 * 60 * 1000, // 1 minute
      max: 100,
      standardHeaders: true,
      legacyHeaders: false,
      keyGenerator: (req) => {
        return (
          (req.headers['x-forwarded-for'] as string)?.split(',')[0] ||
          req.socket.remoteAddress ||
          'unknown'
        )
      },
      message: {
        error: 'Too many requests to internal API, please try again later.',
      },
    })
    const generalApiLimiter = rateLimit({
      windowMs: 1 * 60 * 1000, // 1 minute
      max: 200, // General limit for all other routes
      standardHeaders: true,
      legacyHeaders: false,
      keyGenerator: (req) => {
        return (
          (req.headers['x-forwarded-for'] as string)?.split(',')[0] ||
          req.socket.remoteAddress ||
          'unknown'
        )
      },
      message: { error: 'Too many requests, please try again later.' },
      skip: (req) =>
        req.path.startsWith('/api/spotify') ||
        req.path.startsWith('/api/internal'),
    })

    expressApp.use('/api/spotify/', spotifyApiLimiter)
    expressApp.use('/api/internal/', internalApiLimiter)
    expressApp.use('/api/', generalApiLimiter)
  }
}
