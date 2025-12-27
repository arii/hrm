// server.ts (Refactored)
import express from 'express'
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

  // Global body parsing is intentionally omitted.
  // ... (rate limiting and static asset serving setup remains the same)

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
