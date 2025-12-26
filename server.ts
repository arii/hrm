// server.ts (Refactored)
import express from 'express'
import { createServer } from 'http'
import next from 'next'
import path from 'path'
import { env } from './lib/env.js'
import { createServices } from './lib/services.js'
import { WebSocketManager } from './lib/websocket.js'
import { initSocketManager } from './utils/socketManager.js'
import { StateSnapshot } from './types/websocket.js'
import { serviceContainer } from './lib/serviceContainer.js'
import { checkTimerService, checkWebSocketService } from './lib/healthCheck.js'
import logger from './utils/logger.js'
import rateLimit from 'express-rate-limit'
import { Socket } from 'net'

const app = next({
  dev: env.NODE_ENV !== 'production',
  hostname: env.HOST,
  port: env.PORT,
})

const handle = app.getRequestHandler()
const expressApp = express()

app.prepare().then(async () => {
  const server = createServer(expressApp)

  // Rate Limiting
  if (env.NODE_ENV !== 'test') {
    const limiter = rateLimit({
      windowMs: 15 * 60 * 1000,
      max: 100,
    })
    expressApp.use(limiter)
  }

  // Static Asset Serving
  if (env.NODE_ENV === 'production') {
    const staticPath = path.join(process.cwd(), '.next/static')
    expressApp.use('/_next/static', express.static(staticPath, {
      immutable: true,
      maxAge: '365d',
    }))
  }

  // 1. Setup WebSocket Infrastructure
  const wsManager = new WebSocketManager()

  // 2. Setup Services with Broadcaster
  const services = await createServices(wsManager.createBroadcaster())

  // 3. Register services with the service container
  serviceContainer.register('spotifyService', services.spotifyService)
  serviceContainer.register('tabataService', services.tabataService)

  // 4. State Snapshot Function
  const getUnifiedStateSnapshot = (): StateSnapshot => ({
    timerData: serviceContainer.get('tabataService').getState(),
    spotifyData: services.spotifyService.getState(),
    spotifyServiceInitialized: services.spotifyService.isReady(),
  })

  // 5. Initialize Socket Logic (Controllers)
  initSocketManager(wsManager.wss, getUnifiedStateSnapshot)

  // 6. Routes
  expressApp.get('/api/health', (_req, res) => {
    res.status(200).json({ status: 'ok' })
    return
  })

  expressApp.get('/api/internal/health/services', async (_req, res) => {
    const timerCheck = checkTimerService(serviceContainer.get('tabataService'))
    const wsCheck = await checkWebSocketService()

    const healthy = timerCheck.healthy && wsCheck.healthy
    const details = {
      timer: timerCheck,
      websocket: wsCheck,
    }

    res.status(healthy ? 200 : 503).json({ healthy, details })
  })

  expressApp.get('/api/spotify/devices', async (_req, res) => {
    if (!services.spotifyService.isReady())
      return res.status(503).json({ error: 'Service unavailable' })
    const devices = await services.spotifyService.getAvailableDevices()
    res.json(devices)
  })

  expressApp.all('*', (req, res) => {
    return handle(req, res)
  })

  // 7. Upgrade Handling
  server.on('upgrade', (req, socket, head) => {
    wsManager.handleUpgrade(req, socket as Socket, head)
  })

  server.listen(env.PORT, () => {
    logger.info(`> Ready on http://${env.HOST}:${env.PORT}`)
  })
})
