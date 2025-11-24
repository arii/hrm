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
import { UnifiedStateMessage } from './types/websocket'

// Service Imports (Node loads these .ts files via transpilation)
import rateLimit from 'express-rate-limit'
import { SpotifyPolling } from './services/spotifyPolling.js'
import TabataTimer from './services/tabataTimer.js'
import { initSocketManager } from './utils/socketManager.js'
import { getBaseURL } from './utils/urls.js'
import logger from './utils/logger.js'

const port: number = process.env.PORT ? +process.env.PORT : 3000 // Explicitly handle undefined and convert to number
// Allow overriding bind address via the HOST env var for flexibility in CI/containers
const hostname =
  process.env.NODE_ENV === 'production'
    ? '0.0.0.0'
    : process.env.HOST || '127.0.0.1' // Bind to all interfaces in production

const dev = process.env.NODE_ENV !== 'production'
const app = next({ dev, hostname, port })

logger.info(`Starting server in ${dev ? 'development' : 'production'} mode`)
logger.info(`Environment: NODE_ENV=${process.env.NODE_ENV}`)
logger.info(`NEXTAUTH_URL: ${getBaseURL()}`)
logger.info(`Hostname: ${hostname}, Port: ${port}`)
const handle = app.getRequestHandler()

// Create Express app for routing and middleware
const expressApp = express()

// --- Rate Limiting Setup ---
// Basic rate-limiting middleware to prevent abuse.
// This will apply to all HTTP requests handled by the Express server.
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per `window` (here, per 15 minutes)
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
  message: 'Too many requests from this IP, please try again after 15 minutes',
  skip: () => process.env.TESTING === 'true',
})

// Apply the rate limiting middleware to all requests
expressApp.use(limiter)

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

    // Declare spotifyServiceInitialized here
    let spotifyServiceInitialized: boolean = true

    // Function to safely broadcast state from services (Used by Tabata and Spotify services)
    const broadcastState = (data: Partial<UnifiedStateMessage>): void => {
      // Use the socket manager to handle the actual broadcast
      if (wss.clients.size > 0) {
        wss.clients.forEach((client: WebSocket) => {
          if (client.readyState === 1) {
            // 1 means OPEN
            // Note: We use the STATE_UPDATE type defined in types/websocket.ts
            client.send(
              JSON.stringify({
                type: 'STATE_UPDATE',
                spotifyServiceInitialized,
                ...data,
              })
            ) // Include spotifyServiceInitialized
          }
        })
      }
    }

    // 2. Initialize Persistent Services
    let spotifyService: SpotifyPolling
    try {
      spotifyService = await SpotifyPolling.create(broadcastState)
    } catch (e) {
      logger.error({ err: e }, 'SpotifyPolling initialization failed')
      spotifyServiceInitialized = false // Set to false on failure
      // Fallback stub to avoid crashing entire server if Spotify setup fails
      spotifyService = {
        handleCommand: () => {},
        stopPolling: () => {},
        startPolling: () => {},
        setRefreshToken: () => {},
      } as unknown as SpotifyPolling
    }
    const tabataService = new TabataTimer(broadcastState)

    // 3. Initialize WebSocket Manager (to handle commands and connections)
    initSocketManager(wss, { tabataService, spotifyService })

    // --- Express Routing ---

    // API endpoint to get available Spotify devices
    expressApp.get(
      '/api/spotify/devices',
      async (req: Request, res: Response) => {
        if (!spotifyServiceInitialized || !spotifyService) {
          return res
            .status(503)
            .json({ error: 'Spotify service not initialized.' })
        }
        try {
          const devices = await spotifyService.getAvailableDevices()
          return res.json(devices)
        } catch (error) {
          logger.error({ err: error }, 'Error fetching Spotify devices via API')
          return res
            .status(500)
            .json({ error: 'Failed to fetch Spotify devices.' })
        }
      }
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
      return handle(req, res)
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
