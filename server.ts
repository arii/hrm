// server.ts (Refactored)
import './lib/env.js' // Triggers validation immediately
import express, { type RequestHandler } from 'express'
import { createServer } from 'http'
import next from 'next'
import { env } from './lib/env.js' // New import
import { httpLogger } from './utils/logger.server.js'
import { serviceContainer } from './lib/serviceContainer.js'
import { AppServices, createServices } from './lib/services.js' // New import
import { WebSocketManager } from './lib/websocket.js' // New import
import { initSocketManager } from './utils/socketManager.js'
import { StateSnapshot } from './types/websocket.js'
import { Socket } from 'net'
import { checkTimerService, checkWebSocketService } from './lib/healthCheck.js'
import logger from './utils/logger.server.js'
import rateLimit from 'express-rate-limit'
import path from 'path'
import type { SpotifyPolling } from './services/spotifyPolling.js'
import type { SpotifyTokenPayload } from './services/spotifyTokenManager.js'

const app = next({
  dev: env.NODE_ENV !== 'production',
  dir: process.cwd(),
  hostname: env.HOST,
  port: env.PORT,
})
const handle = app.getRequestHandler()
const expressApp = express()

app.prepare().then(async () => {
  const server = createServer(expressApp)

  // --- Logger Setup ---
  // Must be the first middleware to capture all requests
  expressApp.use(httpLogger as RequestHandler)

  // Global body parsing is intentionally omitted here.
  // Next.js API routes handle their own body parsing, and adding a global
  // `express.json()` middleware can cause conflicts, such as the
  // "TypeError: Response body object should not be disturbed or locked" error,
  // by attempting to parse the request body twice.

  // --- Rate Limiting Setup ---
  if (env.NODE_ENV !== 'test') {
    const spotifyApiLimiter = rateLimit({
      windowMs: env.RATE_LIMIT_WINDOW_MS,
      max: env.SPOTIFY_API_MAX_REQUESTS,
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
      windowMs: env.RATE_LIMIT_WINDOW_MS,
      max: env.INTERNAL_API_MAX_REQUESTS,
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
      windowMs: env.RATE_LIMIT_WINDOW_MS,
      max: env.GENERAL_API_MAX_REQUESTS,
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
    const isDeployment = process.env.IS_DEPLOYMENT === 'true'
    const nextDir = isDeployment ? '.next_prod' : '.next'
    const staticPath = path.join(process.cwd(), nextDir, 'static')
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
  const services: AppServices = await createServices(
    wsManager.createBroadcaster()
  )
  serviceContainer.register('spotifyService', services.spotifyService)
  serviceContainer.register('tabataService', services.tabataService)

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

  // This route is for internal, server-to-server communication only.
  // It is used by the Next.js API route to pass the auth token to the
  // stateful services managed by this server.
  expressApp.post('/api/internal/sync-token', express.json(), (req, res) => {
    // 1. Security Check: Ensure the request is coming from our own backend.
    const internalSecret = req.headers['x-internal-secret']
    if (internalSecret !== env.NEXTAUTH_SECRET) {
      logger.warn('Unauthorized attempt to access internal sync-token route.')
      return res.status(403).json({ error: 'Forbidden' })
    }

    // 2. Data Validation: Check for the presence of the token payload.
    const tokenPayload = req.body as SpotifyTokenPayload
    if (!tokenPayload || !tokenPayload.access_token) {
      logger.warn('Sync-token request received without a valid token payload.')
      return res.status(400).json({ error: 'Missing token payload' })
    }

    // 3. Service Interaction: Pass the token to the Spotify service.
    try {
      const spotifyService = serviceContainer.get(
        'spotifyService'
      ) as SpotifyPolling
      if (spotifyService) {
        // The `handleTokenUpdate` is an async method, but we don't need to
        // wait for it to complete to send the response. We can let it
        // run in the background.
        spotifyService.handleTokenUpdate(tokenPayload)
        logger.info(
          'Successfully passed token to spotifyService for background update.'
        )
        return res.status(202).json({ message: 'Token received for sync.' })
      } else {
        logger.error('Spotify service not found in service container.')
        return res
          .status(500)
          .json({ error: 'Internal Server Error: Service not available' })
      }
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'An unknown error occurred.'
      logger.error({ error: message }, 'Error during token sync service call')
      return res.status(500).json({ error: 'Internal Server Error' })
    }
  })

  expressApp.use((req, res) => handle(req, res))

  // 5. Upgrade Handling
  const wsConnections = new Map<string, number>()

  server.on('upgrade', (req, socket, head) => {
    const ip =
      (req.headers['x-forwarded-for'] as string)?.split(',').shift()?.trim() ||
      req.socket.remoteAddress

    if (env.NODE_ENV !== 'test' && ip) {
      const count = wsConnections.get(ip) || 0
      if (count >= env.WS_MAX_CONNECTIONS) {
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
})
