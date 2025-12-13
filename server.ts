// File: server.js (Unified Next.js and WebSocket Server - Custom Entry Point)
/**
 * Description: Custom Node.js HTTP Server that hosts the Next.js application,
 * attaches the persistent WebSocket server, and manages service initialization
 * and internal data endpoints (like NextAuth token delivery).
 */

import express, { Request, Response } from 'express'
import { createServer, IncomingMessage } from 'http'
import next from 'next'
import path from 'path'
import type { WebSocket } from 'ws' // Import WebSocket as a type
import { WebSocketServer } from 'ws'

// Service Imports (Node loads these .ts files via transpilation)
import { SpotifyPolling } from './services/spotifyPolling.js'
import TabataTimer from './services/tabataTimer.js'
import { initSocketManager } from './utils/socketManager.js'
import { broadcast } from './utils/broadcast.js'
import { getBaseURL } from './utils/urls.js'
import { StateSnapshot } from './types/websocket.js'
import logger from './utils/logger.js'
import { performHealthCheck } from './lib/healthCheck.js'
import { API_INTERNAL_TOKEN_DELIVERY as _API_INTERNAL_TOKEN_DELIVERY } from './constants/apiEndpoints.js'
import rateLimit from 'express-rate-limit'
import { getClientIp } from './utils/network.js'

const port: number = process.env.PORT ? +process.env.PORT : 3000
const wsPort: number = process.env.WS_PORT ? +process.env.WS_PORT : 3001

// Allow overriding bind address via the HOST env var for flexibility in CI/containers
const hostname =
  process.env.NODE_ENV === 'production'
    ? '0.0.0.0'
    : process.env.HOST || '127.0.0.1' // Bind to all interfaces in production

const dev = process.env.NODE_ENV !== 'production'

// === QUICK WIN 1: CRITICAL SECURITY CHECK ===
if (!dev && !process.env.NEXTAUTH_SECRET) {
  console.error('FATAL: NEXTAUTH_SECRET environment variable is missing.')
  console.error('This is mandatory for production security. Shutting down.')
  process.exit(1)
}
// ===========================================

const app = next({ dev, hostname, port })

logger.info(`Starting server in ${dev ? 'development' : 'production'} mode`)
logger.info(`Environment: NODE_ENV=${process.env.NODE_ENV}`)
logger.info(`NEXTAUTH_URL: ${getBaseURL()}`)
logger.info(`Hostname: ${hostname}, Port: ${port}, WebSocket Port: ${wsPort}`)
const nextRequestHandler = app.getRequestHandler()

// Create Express app for routing and middleware
const expressApp = express()

// Trust the reverse proxy (nginx) for X-Forwarded-* headers
expressApp.set('trust proxy', true)

// --- Main Application Setup ---

app
  .prepare()
  .then(async () => {
    const server = createServer(expressApp)

    // --- Rate Limiting Setup ---
    // Skip rate limiting for tests to avoid flakes
    if (process.env.TESTING !== 'true') {
      const spotifyApiLimiter = rateLimit({
        windowMs: 1 * 60 * 1000, // 1 minute
        max: 30,
        standardHeaders: true,
        legacyHeaders: false,
        keyGenerator: (req: Request) => {
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
        keyGenerator: (req: Request) => {
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
        keyGenerator: (req: Request) => {
          return (
            (req.headers['x-forwarded-for'] as string)?.split(',')[0] ||
            req.socket.remoteAddress ||
            'unknown'
          )
        },
        message: { error: 'Too many requests, please try again later.' },
        skip: (req: Request) =>
          req.path.startsWith('/api/spotify') ||
          req.path.startsWith('/api/internal'),
      })

      // Apply the rate limiters to specific routes
      expressApp.use('/api/spotify/', spotifyApiLimiter)
      expressApp.use('/api/internal/', internalApiLimiter)
      expressApp.use('/api/', generalApiLimiter)
    }

    // --- Static Asset Serving (Production Only) ---
    // In production, serve the Next.js static assets directly from the .next/static folder.
    // This is more efficient than letting the Next.js handler do it.
    if (!dev) {
      const staticPath = path.join(process.cwd(), '.next/static')
      logger.info(`Serving static files from: ${staticPath}`)

      expressApp.use(
        '/_next/static',
        express.static(staticPath, {
          // All files in _next/static have content hashes, so they can be cached indefinitely.
          immutable: true,
          maxAge: '365d',
        })
      )
    }

    // 1. Initialize WebSocket Server
    const wss = new WebSocketServer({ port: wsPort, host: hostname })

    // 2. Initialize Persistent Services
    let spotifyService: SpotifyPolling
    try {
      spotifyService = await SpotifyPolling.create(broadcast)
    } catch (e) {
      logger.error({ err: e }, 'SpotifyPolling initialization failed. Exiting.')
      process.exit(1)
    }
    const tabataService = new TabataTimer(broadcast)

    // 3. State Snapshot Function
    const getUnifiedStateSnapshot = (): StateSnapshot => ({
      timerData: tabataService.getState(),
      spotifyData: spotifyService.getState(),
      spotifyServiceInitialized: spotifyService.isReady(),
    })

    // 4. Initialize WebSocket Manager
    initSocketManager(
      wss,
      { tabataService, spotifyService },
      getUnifiedStateSnapshot
    )

    const wsConnections = new Map<string, number>()
    const WS_MAX_CONNECTIONS = 5

    wss.on('connection', (ws: WebSocket, req: IncomingMessage) => {
      const ip = getClientIp(req)

      if (process.env.TESTING !== 'true' && ip) {
        const count = wsConnections.get(ip) || 0
        if (count >= WS_MAX_CONNECTIONS) {
          ws.terminate()
          return
        }
        wsConnections.set(ip, count + 1)

        ws.on('close', () => {
          const currentCount = wsConnections.get(ip) || 0
          if (currentCount > 0) {
            wsConnections.set(ip, currentCount - 1)
          }
        })
      }
    })

    // --- Express Routing ---
    expressApp.get('/api/health', (_req: Request, res: Response) => {
      res.status(200).json({ status: 'ok' })
    })

    expressApp.get(
      '/api/health/ready',
      async (_req: Request, res: Response) => {
        const healthStatus = await performHealthCheck(
          wss,
          spotifyService,
          tabataService
        )
        const statusCode = healthStatus.status === 'unhealthy' ? 503 : 200
        res.status(statusCode).json(healthStatus)
      }
    )

    expressApp.use(async (req: Request, res: Response) => {
      return nextRequestHandler(req, res)
    })

    // --- Start Server ---
    server.on('error', (err: NodeJS.ErrnoException) => {
      if (err.code === 'EADDRINUSE') {
        logger.error({ err }, `Port ${port} is already in use.`)
      } else {
        logger.error({ err }, 'Server error')
      }
      process.exit(1)
    })

    server.listen(port, hostname, () => {
      logger.info(`> Ready on http://${hostname}:${port}`)
      logger.info(`> WebSocket Server listening on ws://${hostname}:${wsPort}`)
    })
  })
  .catch((err: Error) => {
    logger.error({ err }, 'Next.js preparation failed')
    process.exit(1)
  })
