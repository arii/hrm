// standalone-server.ts
import express, { Request, Response } from 'express'
import { createServer } from 'http'
import next from 'next'
import { env } from './lib/env.js'
import { serviceContainer } from './lib/serviceContainer.js'
import { AppServices, createServices } from './lib/services.js'
import { WebSocketManager } from './lib/websocket.js'
import { initSocketManager } from './utils/socketManager.js'
import { StateSnapshot } from './types/websocket.js'
import { Socket } from 'net'
import { checkTimerService, checkWebSocketService } from './lib/healthCheck.js'
import logger from './utils/logger.js'
import rateLimit from 'express-rate-limit'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const appDir = path.join(__dirname, '..')

const app = next({
  dev: false,
  dir: appDir,
  hostname: env.HOST,
  port: env.PORT,
})
const handle = app.getRequestHandler()
const expressApp = express()

app.prepare().then(async () => {
  const server = createServer(expressApp)

  if (env.NODE_ENV !== 'test') {
    const spotifyApiLimiter = rateLimit({
      windowMs: 1 * 60 * 1000,
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
      windowMs: 1 * 60 * 1000,
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
      windowMs: 1 * 60 * 1000,
      max: 200,
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

  const wsManager = new WebSocketManager()

  const services: AppServices = await createServices(
    wsManager.createBroadcaster()
  )
  serviceContainer.register('spotifyService', services.spotifyService)
  serviceContainer.register('tabataService', services.tabataService)

  const getUnifiedStateSnapshot = (): StateSnapshot => ({
    timerData: services.tabataService.getState(),
    spotifyData: services.spotifyService.getState(),
    spotifyServiceInitialized: services.isSpotifyInitialized,
  })

  initSocketManager(wsManager.wss, getUnifiedStateSnapshot, services)

  expressApp.get('/api/health', (_req: Request, res: Response) => {
    res.status(200).json({ status: 'ok' })
  })

  expressApp.get(
    '/api/internal/health/services',
    async (_req: Request, res: Response) => {
      const timerCheck = checkTimerService(services.tabataService)
      const wsCheck = await checkWebSocketService()

    const healthy = timerCheck.healthy && wsCheck.healthy
    const details = {
      timer: timerCheck,
      websocket: wsCheck,
    }

    res.status(200).json({ healthy, details })
  })

  expressApp.use((req: Request, res: Response) => handle(req, res))

  const wsConnections = new Map<string, number>()

  server.on('upgrade', (req, socket, head) => {
    const ip =
      (req.headers['x-forwarded-for'] as string)?.split(',').shift()?.trim() ||
      req.socket.remoteAddress

    if (env.NODE_ENV !== 'test' && ip) {
      const count = wsConnections.get(ip) || 0
      if (count >= env.WS_MAX_CONNECTIONS) {
        logger.warn(
          `WebSocket connection from ${ip} rejected. Rate limit exceeded.`
        )
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
}).catch((err) => {
  logger.error('Error preparing Next.js app:', err)
  process.exit(1)
})
