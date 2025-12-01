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
import { broadcast } from './utils/broadcast.js'
import { getBaseURL } from './utils/urls.js'
import { StateSnapshot } from './types/websocket.js'
import logger from './utils/logger.js'
import swaggerUi from 'swagger-ui-express'
import swaggerSpec from './lib/swagger.js'

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
    const wss = new WebSocketServer({ noServer: true })

    // 2. Initialize Persistent Services
    let spotifyService: SpotifyPolling
    try {
      spotifyService = await SpotifyPolling.create(broadcast)
    } catch (e) {
      logger.error({ err: e }, 'SpotifyPolling initialization failed')
      broadcast({
        type: 'SPOTIFY_SERVICE_INIT_UPDATE',
        payload: false,
      })
      // Fallback stub to avoid crashing entire server if Spotify setup fails
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

    // 4. Initialize WebSocket Manager (to handle commands and connections)
    initSocketManager(wss, { tabataService, spotifyService }, getUnifiedStateSnapshot)

    // --- Express Routing ---

    // Swagger UI
    expressApp.use(
      '/api-docs',
      swaggerUi.serve,
      swaggerUi.setup(swaggerSpec)
    )

    // Handle all Next.js routing (pages, API routes, etc.)
    // Token delivery is handled by Next.js API route at /api/internal/token-delivery
    expressApp.use(async (req: Request, res: Response) => {
      // Intercept token delivery POST and force Spotify poll
      if (
        req.method === 'POST' &&
        req.url &&
        req.url.includes('/api/internal/token-delivery')
      ) {
        // Wait a moment for token to be written
        setTimeout(async () => {
          if (spotifyService) {
            // Signal the service to reload tokens from disk
            spotifyService.setRefreshToken('signal')

            // Wait a bit for reload, then force poll
            setTimeout(async () => {
              if (typeof spotifyService.forcePollAndBroadcast === 'function') {
                await spotifyService.forcePollAndBroadcast()
              }
            }, 1500)
          }
        }, 1000)
      }
      return nextRequestHandler(req, res)
    }) // --- HTTP/WS Upgrade Handling ---

    // Attach the WebSocket server to the HTTP server instance using the 'upgrade' event
    server.on(
      'upgrade',
      (req: IncomingMessage, socket: Socket, head: Buffer) => {
        const { pathname } = parse(req.url || '')

        // Only upgrade connections to the specific WebSocket path
        if (pathname === '/ws') {
          wss.handleUpgrade(req, socket, head, (ws: WebSocket) => {
            wss.emit('connection', ws, req)
          })
        }
        // If not our WebSocket path, simply return and let other upgrade handlers (e.g., Next.js's) take over.
        // DO NOT re-emit "upgrade" as it can lead to infinite recursion.
      }
    )

    // --- Start Server ---

    // Handle server errors (e.g., port already in use)
    server.on('error', (err: Error) => {
      logger.error({ err }, 'Server error')
      process.exit(1)
    })

    // Begin listening
    server.listen(port, hostname, () => {
      // This callback only runs on successful listening
      logger.info(`> Ready on http://${hostname}:${port}`)
      logger.info(`> WebSocket Server listening on ws://${hostname}:${port}/ws`)
    })
  })
  .catch((err: Error) => {
    logger.error({ err }, 'Next.js preparation failed')
    process.exit(1)
  })
