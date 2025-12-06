// File: server.js (Unified Next.js and WebSocket Server - Custom Entry Point)
/**
 * Description: Custom Node.js HTTP Server that hosts the Next.js application,
 * attaches the persistent WebSocket server, and manages service initialization
 * and internal data endpoints (like NextAuth token delivery).
 */

import express, { Request, Response, NextFunction } from 'express'
import { createServer, IncomingMessage } from 'http'
import { Socket } from 'net'
import next from 'next'
import path from 'path'
import { parse } from 'url'
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
import { API_INTERNAL_TOKEN_DELIVERY } from './constants/apiEndpoints.js'
import rateLimit from 'express-rate-limit'

const port: number = process.env.PORT ? +process.env.PORT : 3000 // Explicitly handle undefined and convert to number
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
logger.info(`Hostname: ${hostname}, Port: ${port}`)
const nextRequestHandler = app.getRequestHandler()

// Create Express app for routing and middleware
const expressApp = express()

// --- Main Application Setup ---

app
  .prepare()
  .then(async () => {
    const server = createServer(expressApp)

    // --- Rate Limiting Setup ---
    if (process.env.TESTING !== 'true') {
      const spotifyApiLimiter = rateLimit({
        windowMs: 1 * 60 * 1000,
        max: 30,
        standardHeaders: true,
        legacyHeaders: false,
        message: {
          error: 'Too many requests to Spotify API, please try again later.',
        },
      })

      const internalApiLimiter = rateLimit({
        windowMs: 1 * 60 * 1000,
        max: 100,
        standardHeaders: true,
        legacyHeaders: false,
        message: {
          error: 'Too many requests to internal API, please try again later.',
        },
      })
      const generalApiLimiter = rateLimit({
        windowMs: 1 * 60 * 1000,
        max: 200,
        standardHeaders: true,
        legacyHeaders: false,
        message: { error: 'Too many requests, please try again later.' },
        skip: (req: Request) =>
          req.path.startsWith('/api/spotify') ||
          req.path.startsWith('/api/internal'),
      })

      expressApp.use('/api/spotify/', spotifyApiLimiter)
      expressApp.use('/api/internal/', internalApiLimiter)
      expressApp.use('/api/', generalApiLimiter)
    }

    // --- Static Asset Serving (Production Only) ---
    if (!dev) {
      const staticPath = path.join(process.cwd(), '.next/static')
      logger.info(`Serving static files from: ${staticPath}`)
      expressApp.use(
        '/_next/static',
        express.static(staticPath, {
          immutable: true,
          maxAge: '365d',
        })
      )
    }

    // 1. Initialize WebSocket Server
    const wss = new WebSocketServer({ noServer: true })

    // 2. Initialize Persistent Services
    let spotifyService: SpotifyPolling
    try {
      spotifyService = await SpotifyPolling.create(broadcast)
      await spotifyService.loadInitialToken() // Attempt to load token from DB on startup
    } catch (e) {
      logger.error({ err: e }, 'SpotifyPolling initialization failed')
      broadcast({
        type: 'SPOTIFY_SERVICE_INIT_UPDATE',
        payload: false,
      })
      spotifyService = {
        handleCommand: () => {},
        stopPolling: () => {},
        startPolling: () => {},
        setRefreshToken: () => {},
      } as unknown as SpotifyPolling
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

    // --- Express Routing ---

    // Health Check Endpoints
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

    // Token delivery is handled by Next.js API route, but we can still intercept
    expressApp.use(express.json()) // Middleware to parse JSON bodies
    expressApp.use(async (req: Request, _res: Response, next: NextFunction) => {
      if (
        req.method === 'POST' &&
        req.url &&
        req.url.includes(API_INTERNAL_TOKEN_DELIVERY)
      ) {
        const { userId } = req.body
        if (spotifyService && userId) {
          await spotifyService.setRefreshToken(userId)
        }
      }
      next()
    })

    // Handle all Next.js routing
    expressApp.use((req: Request, res: Response) => {
      return nextRequestHandler(req, res)
    })

    const wsConnections = new Map<string, number>()
    const WS_MAX_CONNECTIONS = 5

    server.on(
      'upgrade',
      (req: IncomingMessage, socket: Socket, head: Buffer) => {
        const { pathname } = parse(req.url || '')
        const ip =
          (req.headers['x-forwarded-for'] as string)
            ?.split(',')
            .shift()
            ?.trim() || req.socket.remoteAddress

        if (process.env.TESTING !== 'true' && ip) {
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

        if (pathname === '/ws') {
          wss.handleUpgrade(req, socket, head, (ws: WebSocket) => {
            wss.emit('connection', ws, req)
          })
        }
      }
    )

    server.on('error', (err: Error) => {
      logger.error({ err }, 'Server error')
      process.exit(1)
    })

    server.listen(port, hostname, () => {
      logger.info(`> Ready on http://${hostname}:${port}`)
      logger.info(`> WebSocket Server listening on ws://${hostname}:${port}/ws`)
    })
  })
  .catch((err: Error) => {
    logger.error({ err }, 'Next.js preparation failed')
    process.exit(1)
  })
