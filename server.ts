// server.ts (Refactored)
import express from 'express'
import { createServer } from 'http'
import next from 'next'
import { closeDb, initDb } from './lib/db.js'
import { env } from './lib/env.js'
import { WebSocketManager } from './lib/websocket.js'
import { initSocketManager } from './utils/socketManager.js'
import { StateSnapshot } from './types/websocket.js'
import { Socket } from 'net'
import { checkTimerService, checkWebSocketService } from './lib/healthCheck.js'
import logger from './utils/logger.js'
import rateLimit from 'express-rate-limit'
import path from 'path'

const app = next({
  dev: env.NODE_ENV !== 'production',
  hostname: env.HOST,
  port: env.PORT,
})
const handle = app.getRequestHandler()
const expressApp = express()

app.prepare().then(async () => {
  // Initialize the database connection and schema
  initDb()

  // Dynamically import services after DB initialization
  const { createServices } = await import('./lib/services.js')
  const { cleanupOldSessions } = await import(
    './services/hrmDataService.js'
  )

  // --- Scheduled Tasks ---
  const startScheduledTasks = () => {
    // Run once on startup
    cleanupOldSessions()

    // Schedule periodic cleanup
    const cleanupIntervalHours = env.WORK_DATA_CLEANUP_INTERVAL_HOURS
    if (cleanupIntervalHours > 0) {
      setInterval(cleanupOldSessions, cleanupIntervalHours * 60 * 60 * 1000)
    }
  }

  startScheduledTasks()

  const server = createServer(expressApp)

  expressApp.use(express.json())

  // --- Rate Limiting Setup ---
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

    // Apply the rate limiters to specific routes
    expressApp.use('/api/spotify/', spotifyApiLimiter)
    expressApp.use('/api/internal/', internalApiLimiter)
    expressApp.use('/api/', generalApiLimiter)
  }

  // --- Static Asset Serving (Production Only) ---
  if (env.NODE_ENV === 'production') {
    const staticPath = path.join(process.cwd(), '.next/static')
    expressApp.use(
      '/_next/static',
      express.static(staticPath, {
        immutable: true,
        maxAge: '1y',
      })
    )
  }

  // 1. Setup WebSocket Infrastructure
  const wsManager = new WebSocketManager()

  // 2. Setup Services with Broadcaster
  const services = await createServices(wsManager.createBroadcaster())

  // 3. Initialize Socket Logic (Controllers)
  const getUnifiedStateSnapshot = (): StateSnapshot => ({
    timerData: services.tabataService.getState(),
    spotifyData: services.spotifyService.getState(),
    spotifyServiceInitialized: services.isSpotifyInitialized,
  })

  initSocketManager(wsManager.wss, getUnifiedStateSnapshot, services)

  // 4. Routes
  expressApp.get('/api/health', (_req, res) => {
    res.status(200).json({ status: 'ok' })
  })

  expressApp.get('/api/internal/health/services', async (_req, res) => {
    const timerCheck = checkTimerService(services.tabataService)
    const wsCheck = await checkWebSocketService()

    const healthy = timerCheck.healthy && wsCheck.healthy
    const details = {
      timer: timerCheck,
      websocket: wsCheck,
    }

    res.status(200).json({ healthy, details })
  })

  expressApp.use((req, res) => handle(req, res))

  // 5. Upgrade Handling
  const wsConnections = new Map<string, number>()
  const WS_MAX_CONNECTIONS = 5

  server.on('upgrade', (req, socket, head) => {
    const ip =
      (req.headers['x-forwarded-for'] as string)?.split(',').shift()?.trim() ||
      req.socket.remoteAddress

    if (env.NODE_ENV !== 'test' && ip) {
      const count = wsConnections.get(ip) || 0
      if (count >= WS_MAX_CONNECTIONS) {
        socket.write('HTTP/1.1 429 Too Many Requests\r\n\r\n')
        socket.destroy()
        return
      }
      wsConnections.set(ip, count + 1)

      socket.on('close', () => {
        const currentCount = wsConnections.get(ip) || 0
        if (currentCount > 0) {
          wsConnections.set(ip, currentCount - 1)
        }
      })
    }
    wsManager.handleUpgrade(req, socket as Socket, head)
  })

  server.listen(env.PORT, () => {
    logger.info(`> Ready on http://${env.HOST}:${env.PORT}`)
  })

  // --- Graceful Shutdown ---
  const gracefulShutdown = (signal: string) => {
    logger.info(`Received ${signal}. Shutting down gracefully...`)
    closeDb()
    server.close(() => {
      logger.info('HTTP server closed.')
      process.exit(0)
    })
  }

  process.on('SIGINT', () => gracefulShutdown('SIGINT'))
  process.on('SIGTERM', () => gracefulShutdown('SIGTERM'))
})
