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
import { API_INTERNAL_TOKEN_DELIVERY } from './constants/apiEndpoints.js'
import { performHealthCheck } from './lib/healthCheck.js'
import { SpotifyPolling } from './services/spotifyPolling.js'
import TabataTimer from './services/tabataTimer.js'
import { StateSnapshot } from './types/websocket.js'
import { broadcast } from './utils/broadcast.js'
import logger from './utils/logger.js'
import {
  broadcastUnifiedState,
  initSocketManager,
} from './utils/socketManager.js'
import { getBaseURL } from './utils/urls.js'

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
logger.info(`Environment: NODE_ENV=${process.env.NODE_ENV}`)
logger.info(`NEXTAUTH_URL: ${getBaseURL()}`)
logger.info(`Hostname: ${hostname}, Port: ${port}`)
const nextRequestHandler = app.getRequestHandler()

const expressApp = express()
expressApp.set('trust proxy', true)

app
  .prepare()
  .then(async () => {
    const server = createServer(expressApp)

    if (process.env.TESTING !== 'true') {
      // Rate limiting setup...
    }

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

    const wss = new WebSocketServer({ noServer: true })

    // DECOUPLING: Create a mutable object to hold the broadcast trigger.
    // This breaks the circular dependency between services and the socket manager.
    const stateChangeBroadcaster = {
      trigger: () => {
        logger.warn(
          'A service state change was triggered before the broadcaster was fully initialized.'
        )
      },
    }
    // Services will call this wrapper, which in turn will call the trigger.
    const onStateChange = () => stateChangeBroadcaster.trigger()

    let spotifyService: SpotifyPolling
    try {
      spotifyService = await SpotifyPolling.create(onStateChange)
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
    const tabataService = new TabataTimer(onStateChange)

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

    // NOW that the socket manager is initialized, connect our trigger
    // to the real broadcast function.
    stateChangeBroadcaster.trigger = broadcastUnifiedState

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
      if (
        req.method === 'POST' &&
        req.url &&
        req.url.includes(API_INTERNAL_TOKEN_DELIVERY)
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
