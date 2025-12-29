// server.ts (Refactored)
import crypto from 'crypto'
import express from 'express'
import { createServer } from 'http'
import next from 'next'
import { env } from './lib/env.js' // New import
import { serviceContainer } from './lib/serviceContainer.js'
import { AppServices, createServices } from './lib/services.js' // New import
import { WebSocketManager } from './lib/websocket.js' // New import
import { initSocketManager } from './utils/socketManager.js'
import { StateSnapshot } from './types/websocket.js'
import { TokenPayload } from './types/index.js'
import { Socket } from 'net'
import { checkTimerService, checkWebSocketService } from './lib/healthCheck.js'
import logger from './utils/logger.js'
import rateLimit from 'express-rate-limit'
import path from 'path'

const app = next({
  dev: env.NODE_ENV !== 'production',
  hostname: env.HOST,
  port: env.PORT,
})
const handle = app.getRequestHandler()
const expressApp = express()

app.prepare().then(async () => {
  const server = createServer(expressApp)

  // Global body parsing is intentionally omitted here.
  // Next.js API routes handle their own body parsing, and adding a global
  // `express.json()` middleware can cause conflicts, such as the
  // "TypeError: Response body object should not be disturbed or locked" error,
  // by attempting to parse the request body twice.

  // --- Rate Limiting Setup ---
  if (env.NODE_ENV !== 'test') {
    const spotifyApiLimiter = rateLimit({
      windowMs: 1 * 60 * 1000, // 1 minute
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
      windowMs: 1 * 60 * 1000, // 1 minute
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
      windowMs: 1 * 60 * 1000, // 1 minute
      max: 200, // General limit for all other routes
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
    const staticPath = path.join(process.cwd(), '.next/static')
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

  /**
   * @description Intercepts the internal token delivery route to ensure the Spotify token
   * is handled by the `spotifyService` instance in this server process.
   * Next.js API routes run in a separate process and cannot access the singleton
   * `spotifyService` instance created here. This handler ensures that the token
   * is delivered to the correct, active service.
   * It uses a separate, dedicated secret (`INTERNAL_TOKEN_DELIVERY_SECRET`) for
   * security, rather than exposing the `NEXTAUTH_SECRET`.
   */
  expressApp.post(
    '/api/internal/token-delivery',
    // Use express.json() middleware only for this route to avoid conflicts
    // with Next.js's body parsing on other API routes.
    express.json(),
    async (req, res) => {
      try {
        const tokenData = req.body as Partial<TokenPayload>
        if (!tokenData.refresh_token) {
          return res.status(400).json({ error: 'Missing refresh_token.' })
        }

        const rawHeader = req.headers['x-internal-token-secret']
        const secretHeader = Array.isArray(rawHeader)
          ? rawHeader[0]
          : rawHeader || ''

        const expected = env.INTERNAL_TOKEN_DELIVERY_SECRET || ''
        const isValid =
          secretHeader.length === expected.length &&
          crypto.timingSafeEqual(
            Buffer.from(secretHeader),
            Buffer.from(expected)
          )

        if (!isValid) {
          return res.status(401).json({ error: 'Unauthorized.' })
        }

        if (!services.spotifyService || !services.spotifyService.isReady()) {
          logger.warn(
            'Internal token delivery failed: Spotify service not available.'
          )
          return res
            .status(503)
            .json({ error: 'Spotify service is not available.' })
        }

        await services.spotifyService.handleTokenUpdate({
          access_token: tokenData.access_token || '',
          token_type: 'Bearer',
          expires_in: tokenData.expires_in || 0,
          refresh_token: tokenData.refresh_token || '',
          scope: '',
          obtainedAt: Date.now(),
        })

        logger.info(
          'Spotify token delivered and processed successfully via server intercept.'
        )
        return res
          .status(200)
          .json({ ok: true, message: 'Token delivered successfully.' })
      } catch (err) {
        const error = err instanceof Error ? err : new Error('An unknown error occurred')
        logger.error(
          { err: error, message: error.message },
          'Unhandled error in server-side token-delivery'
        )
        return res.status(500).json({ error: 'server_error', message: error.message })
      }
    }
  )

  expressApp.use((req, res) => handle(req, res))

  // 5. Upgrade Handling
  const wsConnections = new Map<string, number>()
  const WS_MAX_CONNECTIONS = 5

  server.on('upgrade', (req, socket, head) => {
    const ip =
      (req.headers['x-forwarded-for'] as string)?.split(',').shift()?.trim() ||
      req.socket.remoteAddress

    if (env.NODE_ENV !== 'test' && ip) {
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
    wsManager.handleUpgrade(req, socket as Socket, head)
  })

  server.listen(env.PORT, () => {
    logger.info(`> Ready on http://${env.HOST}:${env.PORT}`)
  })
})
