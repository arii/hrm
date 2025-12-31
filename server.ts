// server.ts
import express from 'express'
import { createServer } from 'http'
import next from 'next'
import path from 'path'
import { Socket } from 'net'

import { env } from './lib/env.js'
import { serviceContainer } from './lib/serviceContainer.js'
import { AppServices, createServices } from './lib/services.js'
import { WebSocketManager } from './lib/websocket.js'
import { checkTimerService, checkWebSocketService } from './lib/healthCheck.js'
import { initSocketManager } from './utils/socketManager.js'
import logger from './utils/logger.js'

// Imported modules
import { createRateLimiters } from './lib/middleware/rateLimit.js'
import { handleConnectionLimit } from './lib/websocket/connectionTracker.js'
import { StateSnapshot } from './types/websocket.js'

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

  // 1. Apply Middleware (Rate Limits)
  const { spotifyApiLimiter, internalApiLimiter, generalApiLimiter } = createRateLimiters()

  if (env.NODE_ENV !== 'test') {
    expressApp.use('/api/spotify/', spotifyApiLimiter)
    expressApp.use('/api/internal/', internalApiLimiter)
    expressApp.use('/api/', generalApiLimiter)
  }

  // 2. Static Assets (Production)
  if (env.NODE_ENV === 'production') {
    const isDeployment = process.env.IS_DEPLOYMENT === 'true'
    const nextDir = isDeployment ? '.next_prod' : '.next'
    expressApp.use(
      '/_next/static',
      express.static(path.join(process.cwd(), nextDir, 'static'), {
        immutable: true,
        maxAge: '1y',
      })
    )
  }

  // 3. Initialize Services
  const wsManager = new WebSocketManager()
  const services: AppServices = await createServices(wsManager.createBroadcaster())

  // Register services to container
  serviceContainer.register('spotifyService', services.spotifyService)
  serviceContainer.register('tabataService', services.tabataService)

  // 4. Initialize WebSocket Logic
  const getUnifiedStateSnapshot = (): StateSnapshot => ({
    timerData: services.tabataService.getState(),
    spotifyData: services.spotifyService.getState(),
    spotifyServiceInitialized: services.isSpotifyInitialized,
  })

  initSocketManager(wsManager.wss, getUnifiedStateSnapshot, services)

  // 5. API Routes
  expressApp.get('/api/health', (_, res) => res.status(200).json({ status: 'ok' }))

  expressApp.get('/api/internal/health/services', async (_, res) => {
    const timerCheck = checkTimerService(services.tabataService)
    const wsCheck = await checkWebSocketService()
    res.status(200).json({
      healthy: timerCheck.healthy && wsCheck.healthy,
      details: { timer: timerCheck, websocket: wsCheck }
    })
  })

  // Next.js Handler
  expressApp.use((req, res) => handle(req, res))

  // 6. Upgrade Handling
  server.on('upgrade', (req, socket, head) => {
    const allowed = handleConnectionLimit(req, socket as Socket)
    if (allowed) {
      wsManager.handleUpgrade(req, socket as Socket, head)
    }
  })

  server.listen(env.PORT, () => {
    logger.info(`> Ready on http://${env.HOST}:${env.PORT}`)
  })
})
