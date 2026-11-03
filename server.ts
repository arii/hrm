// server.ts (Refactored)
import './lib/env.js' // Triggers validation immediately
import express, { type RequestHandler } from 'express'
import { createServer } from 'http'
import next from 'next'
import { env } from './lib/env.js' // New import
import { httpLogger } from './utils/logger.server.js'
import logger from './utils/logger.server.js'
import { AppServices, createServices } from './lib/services.js' // New import
import {
  WebSocketManager,
  createWsConnectionLimiter,
  isAppWsUpgrade,
} from './lib/websocket.js' // New import
import { initSocketManager, resetSocketManager } from './utils/socketManager.js'
import { StateSnapshot } from './types/websocket.js'
import { Socket } from 'net'
import { checkTimerService, checkWebSocketService } from './lib/healthCheck.js'
import { resolveClientIp } from './lib/clientIp.js'
import { getBasePath } from './utils/urls.js'
import rateLimit from 'express-rate-limit'
import compression from 'compression'
import helmet from 'helmet'
import path from 'path'

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

  // --- Trust Proxy ---
  // Behind nginx (prod) / Caddy (dev): trust exactly TRUST_PROXY_HOPS so
  // req.ip — used by the rate limiters below — is spoof-proof.
  expressApp.set('trust proxy', env.TRUST_PROXY_HOPS)

  // --- Security Headers ---
  // unsafe-eval is dev-only (Turbopack HMR); prod chunks run without it.
  // No upgrade-insecure-requests: plain-http LAN dev must keep working.
  expressApp.use(
    helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          scriptSrc: [
            "'self'",
            "'unsafe-inline'",
            ...(env.NODE_ENV === 'development' ? ["'unsafe-eval'"] : []),
            'https://sdk.scdn.co',
          ],
          styleSrc: ["'self'", "'unsafe-inline'"],
          // Spotify serves images from both CDN families (i.scdn.co,
          // image-cdn-*.spotifycdn.com); audio streams likewise.
          imgSrc: [
            "'self'",
            'data:',
            'blob:',
            'https://*.scdn.co',
            'https://*.spotifycdn.com',
          ],
          mediaSrc: [
            "'self'",
            'blob:',
            'data:',
            'https://*.scdn.co',
            'https://*.spotifycdn.com',
          ],
          connectSrc: [
            "'self'",
            'ws:',
            'wss:',
            'https://api.spotify.com',
            'https://accounts.spotify.com',
          ],
          fontSrc: ["'self'", 'data:'],
          frameSrc: [
            "'self'",
            'https://docs.google.com',
            // Spotify Web Playback SDK renders a hidden playback iframe.
            'https://sdk.scdn.co',
          ],
          objectSrc: ["'none'"],
          baseUri: ["'self'"],
          formAction: ["'self'"],
          frameAncestors: ["'none'"],
          upgradeInsecureRequests: null,
        },
      },
      frameguard: { action: 'deny' },
      hsts: { maxAge: 31536000, includeSubDomains: true },
      // COEP require-corp would break the Spotify SDK and Google iframe.
      crossOriginEmbedderPolicy: false,
    }) as RequestHandler
  )

  // Global body parsing is intentionally omitted here.
  // Next.js API routes handle their own body parsing, and adding a global
  // `express.json()` middleware can cause conflicts, such as the
  // "TypeError: Response body object should not be disturbed or locked" error,
  // by attempting to parse the request body twice.

  // --- Response Compression ---
  // The front proxy gzips HTML but passes API JSON through uncompressed
  // (verified live on prod). Compress here; upgrade sockets (ws) bypass
  // middleware untouched and proxies pass pre-encoded responses through.
  expressApp.use(compression() as RequestHandler)

  // --- Rate Limiting Setup ---
  if (env.NODE_ENV !== 'test') {
    const spotifyApiLimiter = rateLimit({
      windowMs: env.RATE_LIMIT_WINDOW_MS,
      max: env.SPOTIFY_API_MAX_REQUESTS,
      standardHeaders: true,
      legacyHeaders: false,
      // Default keyGenerator uses req.ip, which honors 'trust proxy' above.
      message: {
        error: 'Too many requests to Spotify API, please try again later.',
      },
    })

    const internalApiLimiter = rateLimit({
      windowMs: env.RATE_LIMIT_WINDOW_MS,
      max: env.INTERNAL_API_MAX_REQUESTS,
      standardHeaders: true,
      legacyHeaders: false,
      // Default keyGenerator uses req.ip, which honors 'trust proxy' above.
      message: {
        error: 'Too many requests to internal API, please try again later.',
      },
    })
    const generalApiLimiter = rateLimit({
      windowMs: env.RATE_LIMIT_WINDOW_MS,
      max: env.GENERAL_API_MAX_REQUESTS,
      standardHeaders: true,
      legacyHeaders: false,
      // Default keyGenerator uses req.ip, which honors 'trust proxy' above.
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

  // WebSocket Infrastructure
  const wsManager = new WebSocketManager()

  // Services
  const services: AppServices = await createServices(
    wsManager.createBroadcaster()
  )

  // Socket Logic
  const getUnifiedStateSnapshot = (): StateSnapshot => ({
    timerData: services.tabataService.getState(),
    spotifyData: services.spotifyService.getState(),
    spotifyServiceInitialized: services.isSpotifyInitialized,
  })

  initSocketManager(wsManager.wss, getUnifiedStateSnapshot, services)

  // Routes
  expressApp.get('/api/health', (_req, res) => {
    res.status(200).json({ status: 'ok' })
  })

  // POST /api/debug/reset - Reset the server-side HRM session state (for testing)
  // Gated to prevent accidental use in production
  expressApp.post('/api/debug/reset', (_req, res) => {
    if (env.NODE_ENV === 'production' && !env.ALLOW_DEBUG_RESET) {
      return res
        .status(403)
        .json({ error: 'Debug reset not allowed in production' })
    }
    resetSocketManager()
    logger.info('Server-side HRM state has been reset via /api/debug/reset')
    return res.status(200).json({ status: 'reset' })
  })

  // Single owner of the services health payload in every environment:
  // /api/health/detailed fetches via getInternalApiUrl, which prefixes the
  // basePath when one is configured, so serve both paths here (Express
  // matches exactly and would otherwise fall through to Next).
  const servicesHealthPaths = ['/api/internal/health/services']
  const basePath = getBasePath()
  if (basePath) {
    servicesHealthPaths.push(`${basePath}/api/internal/health/services`)
  }
  expressApp.get(servicesHealthPaths, async (_req, res) => {
    const timerCheck = checkTimerService(services.tabataService)
    const wsCheck = await checkWebSocketService()

    const healthy = timerCheck.healthy && wsCheck.healthy
    const details = {
      timer: timerCheck,
      websocket: wsCheck,
    }

    res.status(200).json({ healthy, details })
  })

  expressApp.use((req, res) => handle(req, res))

  // Upgrade Handling: only app sockets consume the per-IP budget. HMR and
  // other upgrades pass through untracked (Next's own listener handles HMR).
  const wsLimiter = createWsConnectionLimiter(env.WS_MAX_CONNECTIONS)

  server.on('upgrade', (req, socket, head) => {
    if (env.NODE_ENV !== 'test' && isAppWsUpgrade(req.url)) {
      const ip = resolveClientIp(
        req.headers['x-forwarded-for'],
        req.socket.remoteAddress,
        env.TRUST_PROXY_HOPS
      )

      if (ip !== 'unknown' && !wsLimiter.checkAndTrack(ip, socket as Socket)) {
        socket.write('HTTP/1.1 429 Too Many Requests\r\n\r\n')
        socket.destroy()
        return
      }
    }
    wsManager.handleUpgrade(req, socket as Socket, head)
  })

  server.listen(env.PORT, () => {
    logger.info(`> Ready on http://${env.HOST}:${env.PORT}`)
  })
})
