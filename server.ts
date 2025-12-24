// File: server.js (Unified Next.js and WebSocket Server - Custom Entry Point)
/**
 * Description: Custom Node.js HTTP Server that hosts the Next.js application,
 * attaches the persistent WebSocket server, and manages service initialization
 * and internal data endpoints (like NextAuth token delivery).
 */

import express, { Request, Response } from 'express'
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
import { broadcast } from './utils/websocketUtils.js'
import { serviceContainer } from './lib/serviceContainer.js'
import { getBaseURL } from './utils/urls.js'
import { ServerMessage, StateSnapshot } from './types/websocket.js'
import logger from './utils/logger.js'
import { checkTimerService, checkWebSocketService } from './lib/healthCheck.js'
import { API_INTERNAL_TOKEN_DELIVERY } from './constants/apiEndpoints.js'
import rateLimit from 'express-rate-limit'
import { SpotifyTokenPayloadSchema } from './lib/validation/schemas.js'

const port: number = process.env.PORT ? +process.env.PORT : 3000 // Explicitly handle undefined and convert to number
// Allow overriding bind address via the HOST env var for flexibility in CI/containers
const hostname =
  process.env.NODE_ENV === 'production'
    ? '0.0.0.0'
    : process.env.HOST || '127.0.0.1' // Bind to all interfaces in production

const dev = process.env.NODE_ENV !== 'production'

// === CRITICAL SECURITY CHECK ===
// Ensure NEXTAUTH_SECRET is present in production to prevent runtime errors
if (!dev && !process.env.NEXTAUTH_SECRET) {
  console.error('FATAL: NEXTAUTH_SECRET environment variable is missing.')
  console.error('This is mandatory for production security. Shutting down.')
  process.exit(1)
}

const app = next({ dev, hostname, port })

logger.info(`Starting server in ${dev ? 'development' : 'production'} mode`)
logger.info(`Environment: NODE_ENV=${process.env.NODE_ENV}`)
logger.info(`NEXTAUTH_URL: ${getBaseURL()}`)
logger.info(`Hostname: ${hostname}, Port: ${port}`)
const nextRequestHandler = app.getRequestHandler()

// Create Express app for routing and middleware
const expressApp = express()
// Enable JSON body parsing for all routes
expressApp.use(express.json())

// Trust the reverse proxy (nginx) for X-Forwarded-* headers
expressApp.set('trust proxy', true)

export async function setup(appInstance: express.Express) {
  // --- Rate Limiting Setup ---
  // Skip rate limiting for tests to avoid flakes
    if (process.env.TESTING !== 'true') {
      const spotifyApiLimiter = rateLimit({
        windowMs: 1 * 60 * 1000, // 1 minute
        max: 30,
        standardHeaders: true,
        legacyHeaders: false,
        keyGenerator: (req: Request) => {
          // Use X-Forwarded-For if available (from reverse proxy), else use socket address
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
          // Use X-Forwarded-For if available (from reverse proxy), else use socket address
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
          // Use X-Forwarded-For if available (from reverse proxy), else use socket address
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
      appInstance.use('/api/spotify/', spotifyApiLimiter)
      appInstance.use('/api/internal/', internalApiLimiter)
      appInstance.use('/api/', generalApiLimiter)
    }

    // --- Static Asset Serving (Production Only) ---
    // In production, serve the Next.js static assets directly from the .next/static folder.
    // This is more efficient than letting the Next.js handler do it.
    if (!dev) {
      const staticPath = path.join(process.cwd(), '.next/static')
      logger.info(`Serving static files from: ${staticPath}`)

      appInstance.use(
        '/_next/static',
        express.static(staticPath, {
          // All files in _next/static have content hashes, so they can be cached indefinitely.
          immutable: true,
          maxAge: '365d',
        })
      )
    }

    // 1. Initialize WebSocket Server
    const wss = new WebSocketServer({ noServer: true })

    // 2. Create a broadcast function wrapper to decouple services from WSS instance
    const broadcastUpdate = (message: ServerMessage) => {
      // Dynamically set origin based on the message type for better logging
      const origin = `service.${message.type}`
      broadcast(wss, message, origin)
    }

    // 3. Initialize Persistent Services with the wrapped broadcaster
    const spotifyService = await SpotifyPolling.create(broadcastUpdate)
    serviceContainer.register('spotifyService', spotifyService)
    serviceContainer.register('tabataService', new TabataTimer(broadcastUpdate))

    // 4. State Snapshot Function
    const getUnifiedStateSnapshot = (): StateSnapshot => ({
      timerData: serviceContainer.get('tabataService').getState(),
      spotifyData: spotifyService.getState(),
      spotifyServiceInitialized: spotifyService.isReady(),
    })

    // 5. Initialize WebSocket Manager (to handle commands and connections)
    initSocketManager(wss, getUnifiedStateSnapshot)

    // --- Express Routing ---

    // Health Check Endpoints
    appInstance.get('/api/health', (_req: Request, res: Response) => {
      res.status(200).json({ status: 'ok' })
    })

    // Internal endpoint for stateful service checks
    appInstance.get(
      '/api/internal/health/services',
      async (_req: Request, res: Response) => {
        const timerCheck = checkTimerService(
          serviceContainer.get('tabataService')
        )
        const wsCheck = await checkWebSocketService()

        const healthy = timerCheck.healthy && wsCheck.healthy
        const details = {
          timer: timerCheck,
          websocket: wsCheck,
        }

        res.status(200).json({ healthy, details })
      }
    )

    // Intercept token delivery POST for immediate, stateful updates.
    // This bypasses the standard Next.js handler for this specific route
    // to ensure the singleton spotifyService instance is updated synchronously.
    appInstance.post(API_INTERNAL_TOKEN_DELIVERY, async (req, res) => {
      const validationResult = SpotifyTokenPayloadSchema.safeParse(req.body)

      if (!validationResult.success) {
        // If validation fails, send a 400 Bad Request with error details
        const errorDetails = validationResult.error.flatten()
        logger.warn(
          {
            error: errorDetails,
            body: req.body, // Log the problematic body
          },
          'Invalid token payload received.'
        )
        return res.status(400).json({
          message: 'Invalid token payload.',
          errors: errorDetails,
        })
      }

      // If validation succeeds, process the token update
      try {
        await spotifyService.handleTokenUpdate(validationResult.data)
        logger.info('Successfully updated Spotify token via internal endpoint.')
        return res.status(200).json({ message: 'Token updated successfully.' })
      } catch (err) {
        logger.error(
          { err },
          'Error during synchronous token update handling after validation.'
        )
        return res
          .status(500)
          .json({ message: 'Internal server error while updating token.' })
      }
    })

    // Handle all other Next.js routing (pages, API routes, etc.)
    appInstance.use(async (req: Request, res: Response) => {
      return nextRequestHandler(req, res)
    })

    return wss
}


// --- Main Application Setup ---
if (!process.env.JEST_WORKER_ID) {
  app
    .prepare()
    .then(async () => {
      const wss = await setup(expressApp)
      const server = createServer(expressApp)

      // --- HTTP/WS Upgrade Handling ---
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

      // --- Start Server ---
      server.on('error', (err: Error) => {
        logger.error({ err }, 'Server error')
        process.exit(1)
      })

      server.listen(port, hostname, () => {
        logger.info(`> Ready on http://${hostname}:${port}`)
        logger.info(
          `> WebSocket Server listening on ws://${hostname}:${port}/ws`
        )
      })
    })
    .catch((err: Error) => {
      logger.error({ err }, 'Next.js preparation failed')
      process.exit(1)
    })
}
