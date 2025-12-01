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
import { env } from './lib/env.js'
import config from './lib/config.js'

const port = env.PORT
const hostname = config.isProduction ? '0.0.0.0' : env.HOST
const dev = !config.isProduction

const app = next({ dev, hostname, port })

logger.info(
  `Starting server in ${config.isDevelopment ? 'development' : 'production'} mode`
)
logger.info(`Environment: NODE_ENV=${env.NODE_ENV}`)
logger.info(`NEXTAUTH_URL: ${getBaseURL()}`)
logger.info(`Hostname: ${hostname}, Port: ${port}`)
const nextRequestHandler = app.getRequestHandler()

// Create Express app for routing and middleware
const expressApp = express()

/**
 * Main application setup and server start.
 * This function initializes the Next.js app, creates an HTTP server,
 * attaches middleware, sets up the WebSocket server, and starts listening for requests.
 */
const startServer = async () => {
  try {
    await app.prepare()
    const server = createServer(expressApp)

    // --- Static Asset Serving (Production Only) ---
    if (config.isProduction) {
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
    expressApp.use(
      '/api-docs',
      swaggerUi.serve,
      swaggerUi.setup(swaggerSpec)
    )

    // --- Health Check Endpoints ---
    expressApp.get('/health/live', (_req, res) => {
      res.status(200).send('OK')
    })

    expressApp.get('/health/ready', (_req, res) => {
      const spotifyReady = spotifyService?.isReady() ?? false
      if (spotifyReady) {
        res.status(200).send('OK')
      } else {
        res.status(503).send('Service Unavailable')
      }
    })

    expressApp.use(async (req: Request, res: Response) => {
      if (
        req.method === 'POST' &&
        req.url &&
        req.url.includes('/api/internal/token-delivery')
      ) {
        setTimeout(async () => {
          if (spotifyService) {
            spotifyService.setRefreshToken('signal')
            setTimeout(async () => {
              if (typeof spotifyService.forcePollAndBroadcast === 'function') {
                await spotifyService.forcePollAndBroadcast()
              }
            }, 1500)
          }
        }, 1000)
      }
      return nextRequestHandler(req, res)
    })

    // --- HTTP/WS Upgrade Handling ---
    server.on(
      'upgrade',
      (req: IncomingMessage, socket: Socket, head: Buffer) => {
        const { pathname } = parse(req.url || '')
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
      logger.info(`> WebSocket Server listening on ws://${hostname}:${port}/ws`)
    })
  } catch (err) {
    logger.error({ err }, 'Next.js preparation failed')
    process.exit(1)
  }
}

startServer()
