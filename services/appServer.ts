import { createServer, Server as HttpServer } from 'http'
import { parse } from 'url'
import next from 'next'
import express, { Request, Response, NextFunction, Express } from 'express'
import { WebSocketServer } from 'ws'
import { z } from 'zod'
import { setupRateLimiting } from '../lib/middleware/validation'
import { globalErrorHandler } from '../lib/middleware/errorHandler'
import { initSocketManager } from '../utils/socketManager'
import { SpotifyPolling } from './spotifyPolling'
import swaggerUi from 'swagger-ui-express'
import * as fs from 'fs'
import * as path from 'path'
import TabataTimer from './tabataTimer'
import { StateSnapshot } from '../types/websocket'
import logger from '../utils/logger'

// Configuration Interface
interface AppConfig {
  dev: boolean
  port: number
  hostname: string
}

export class AppServer {
  public app: Express
  public server: HttpServer | null = null
  public wss: WebSocketServer | null = null
  private nextApp: ReturnType<typeof next>
  private nextHandle: any
  private config: AppConfig

  // Service References
  public tabataTimer: TabataTimer | null = null
  public spotifyService: SpotifyPolling | null = null

  constructor(config: AppConfig) {
    this.config = config
    this.app = express()
    this.nextApp = next({ dev: config.dev, hostname: config.hostname, port: config.port })
    this.nextHandle = this.nextApp.getRequestHandler()
  }

  /**
   * Primary Initialization Flow
   */
  public async initialize(): Promise<void> {
    try {
      await this.nextApp.prepare()
      this.setupMiddleware()
      this.setupServices()
      this.setupRoutes()
      this.setupErrorHandling()
      logger.info('AppServer initialized successfully')
    } catch (error) {
      logger.error({ err: error }, 'Failed to initialize AppServer')
      throw error
    }
  }

  /**
   * 1. Setup Express Middleware
   */
  private setupMiddleware() {
    this.app.use(express.json()) // JSON Body Parsing

    // Security & Rate Limiting
    if (process.env.NODE_ENV === 'production') {
      this.app.set('trust proxy', 1)
      this.app.use(setupRateLimiting())
    }

    // Request Logging
    this.app.use((req, res, next) => {
      logger.debug(`${req.method} ${req.url}`)
      next()
    })
  }

  /**
   * 2. Instantiate and Link Core Services
   */
  private async setupServices() {
    // 2a. HTTP Server creation (needed for WebSockets)
    this.server = createServer(this.app)

    // 2b. WebSocket Server
    this.wss = new WebSocketServer({ server: this.server, path: '/ws' })

    // 2c. Domain Services
    this.tabataTimer = new TabataTimer()

    // Using the factory method from your refactored code
    this.spotifyService = await SpotifyPolling.create((message) => {
      // Direct broadcast bridge
      if (this.wss) {
        import('../utils/broadcast').then(({ broadcast }) => broadcast(message))
      }
    })

    // 2d. Wiring it all together via SocketManager
    const getSnapshot = (): StateSnapshot => ({
      timerData: this.tabataTimer!.getState(),
      spotifyData: this.spotifyService!.getState(),
      // activeAlerts would be injected here if you had an AlertsService
      activeAlerts: [],
      spotifyServiceInitialized: this.spotifyService!.isReady()
    })

    initSocketManager(this.wss, {
      tabataService: this.tabataTimer,
      spotifyService: this.spotifyService
    }, getSnapshot)
  }

  /**
   * 3. Define Routes (API & Next.js Fallback)
   */
  private setupRoutes() {
    // Health Check
    this.app.get('/health', (req, res) => {
      const status = {
        status: 'ok',
        uptime: process.uptime(),
        timestamp: new Date().toISOString(),
        services: {
          ws: this.wss ? 'running' : 'down',
          spotify: this.spotifyService?.isReady() ? 'ready' : 'initializing'
        }
      }
      res.json(status)
    })

    // API Routes (Delegated to Next.js API Routes usually, but custom Express routes go here)
    // --- Swagger UI Setup ---
    const openApiPath = path.join(process.cwd(), 'public', 'openapi.json')

    if (fs.existsSync(openApiPath)) {
      const openApiDocument = JSON.parse(fs.readFileSync(openApiPath, 'utf8'))

      // Serve the UI at /api-docs
      this.app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(openApiDocument))
      logger.info('Swagger UI available at /api-docs')
    } else {
      logger.warn('openapi.json not found. Run `npm run generate:openapi` to build docs.')
    }

    // Next.js Page Handling
    this.app.all('*', (req: Request, res: Response) => {
      const parsedUrl = parse(req.url!, true)
      return this.nextHandle(req, res, parsedUrl)
    })
  }

  /**
   * 4. Global Error Handling
   */
  private setupErrorHandling() {
    this.app.use(globalErrorHandler)
  }

  /**
   * Start Listening
   */
  public start(): void {
    if (!this.server) throw new Error('Server not initialized. Call initialize() first.')

    this.server.listen(this.config.port, (err?: any) => {
      if (err) throw err
      logger.info(`> Ready on http://${this.config.hostname}:${this.config.port}`)

      // Notify process manager (PM2)
      if (process.send) process.send('ready')
    })
  }

  /**
   * Graceful Shutdown
   */
  public async stop(): Promise<void> {
    logger.info('Stopping AppServer...')

    // Stop Services
    this.spotifyService?.cleanup()
    this.tabataTimer?.dispose() // Assuming you add a dispose/cleanup method to TabataTimer

    // Close WebSocket Server
    if (this.wss) {
      this.wss.clients.forEach((client) => client.terminate())
      this.wss.close()
    }

    // Close HTTP Server
    return new Promise((resolve, reject) => {
      if (this.server) {
        this.server.close((err) => {
          if (err) return reject(err)
          logger.info('AppServer stopped')
          resolve()
        })
      } else {
        resolve()
      }
    })
  }
}
