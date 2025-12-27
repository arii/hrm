// server.ts (Refactored)
import express from 'express'
import rateLimit from 'express-rate-limit'
import { createServer } from 'http'
import next from 'next'
import { env } from './lib/env.js' // New import
import { AppServices, createServices } from './lib/services.js' // New import
import { WebSocketManager } from './lib/websocket.js' // New import
import { initializeSocketManager } from './utils/socketManager.js' // Corrected import
import { checkTimerService, checkWebSocketService } from './lib/healthCheck.js'
import logger from './utils/logger.js'

const app = next({
  dev: env.NODE_ENV !== 'production',
  hostname: env.HOST,
  port: env.PORT,
})
const handle = app.getRequestHandler()
const expressApp = express()

app.prepare().then(async () => {
  const server = createServer(expressApp)

  // In production, Next.js serves assets from .next/static.
  // We can add this to Express to avoid 404s if a path is somehow missed by Next.js.
  // It also helps in preventing directory traversal attacks.
  if (env.NODE_ENV === 'production') {
    expressApp.use('/_next/static', express.static('.next/static'))
  }

  // Rate limiting to prevent abuse
  const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // max 100 requests per windowMs
    standardHeaders: true,
    legacyHeaders: false,
    // Skip rate limiting for test environment
    skip: () => process.env.TESTING === 'true',
  })
  expressApp.use(limiter)

  // 1. Setup WebSocket Infrastructure
  const wsManager = new WebSocketManager()

  // 2. Setup Services with Broadcaster
  const services: AppServices = await createServices(
    wsManager.createBroadcaster()
  )

  // 3. Initialize Socket Logic (Controllers)
  initializeSocketManager(wsManager.wss) // Simplified initialization

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

  expressApp.use((req, res) => handle(req, res))

  // 5. Upgrade Handling
  // ... (upgrade handling remains the same)

  server.listen(env.PORT, () => {
    logger.info(`> Ready on http://${env.HOST}:${env.PORT}`)
  })
})
