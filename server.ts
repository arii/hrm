// File: server.js (Unified Next.js and WebSocket Server - Custom Entry Point)
/**
 * Description: Custom Node.js HTTP Server that hosts the Next.js application,
 * attaches the persistent WebSocket server, and manages service initialization.
 * Token management is now handled via database, removing the need for
 * custom token delivery endpoints in this file.
 */

import express, { Request, Response } from 'express'
import { createServer, IncomingMessage } from 'http'
import { Socket } from 'net'
import next from 'next'
import path from 'path'
import { parse } from 'url'
import type { WebSocket } from 'ws' // Import WebSocket as a type
import { WebSocketServer } from 'ws'
import rateLimit from 'express-rate-limit'

// Service Imports
import { SpotifyPolling } from './services/spotifyPolling.js'
import TabataTimer from './services/tabataTimer.js'
import { initSocketManager } from './utils/socketManager.js'
import { broadcast } from './utils/broadcast.js'
import { getBaseURL } from './utils/urls.js'
import { StateSnapshot } from './types/websocket.js'
import logger from './utils/logger.js'
import { performHealthCheck } from './lib/healthCheck.js'

const port: number = process.env.PORT ? +process.env.PORT : 3000
const hostname =
  process.env.NODE_ENV === 'production'
    ? '0.0.0.0'
    : process.env.HOST || '127.0.0.1'

const dev = process.env.NODE_ENV !== 'production'

if (!dev && !process.env.NEXTAUTH_SECRET) {
  console.error('FATAL: NEXTAUTH_SECRET environment variable is missing.')
  process.exit(1)
}

const app = next({ dev, hostname, port })

logger.info(`Starting server in ${dev ? 'development' : 'production'} mode`)
const nextRequestHandler = app.getRequestHandler()

const expressApp = express()

app
  .prepare()
  .then(async () => {
    const server = createServer(expressApp)

    if (process.env.TESTING !== 'true') {
      const limiter = rateLimit({
        windowMs: 15 * 60 * 1000, // 15 minutes
        max: 100, // Limit each IP to 100 requests per windowMs
        standardHeaders: true,
        legacyHeaders: false,
      })
      expressApp.use(limiter)
    }

    if (!dev) {
      const staticPath = path.join(process.cwd(), '.next/static')
      expressApp.use(
        '/_next/static',
        express.static(staticPath, {
          immutable: true,
          maxAge: '365d',
        })
      )
    }

    const wss = new WebSocketServer({ noServer: true })

    // Initialize Persistent Services
    const spotifyService = await SpotifyPolling.create(broadcast)
    const tabataService = new TabataTimer(broadcast)

    const getUnifiedStateSnapshot = (): StateSnapshot => ({
      timerData: tabataService.getState(),
      spotifyData: spotifyService.getState(),
      spotifyServiceInitialized: spotifyService.isReady(),
    })

    initSocketManager(
      wss,
      { tabataService, spotifyService },
      getUnifiedStateSnapshot
    )

    // Health Check Endpoints
    expressApp.get('/api/health/ready', async (_req: Request, res: Response) => {
      const healthStatus = await performHealthCheck(
        wss,
        spotifyService,
        tabataService
      )
      const statusCode = healthStatus.status === 'unhealthy' ? 503 : 200
      res.status(statusCode).json(healthStatus)
    })

    // Handle all Next.js routing
    expressApp.all('*', (req: Request, res: Response) => {
      return nextRequestHandler(req, res)
    })

    const wsConnections = new Map<string, number>()
    const WS_MAX_CONNECTIONS = 5

    server.on(
      'upgrade',
      (req: IncomingMessage, socket: Socket, head: Buffer) => {
        const { pathname } = parse(req.url || '')
        const ip =
          (req.headers['x-forwarded-for'] as string)?.split(',').shift()?.trim() ||
          req.socket.remoteAddress

        if (process.env.TESTING !== 'true' && ip) {
          const count = wsConnections.get(ip) || 0
          if (count >= WS_MAX_CONNECTIONS) {
            socket.write('HTTP/1.1 429 Too Many Requests\\r\\n\\r\\n')
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
    })
  })
  .catch((err: Error) => {
    logger.error({ err }, 'Next.js preparation failed')
    process.exit(1)
  })
