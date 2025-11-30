// File: server.ts (Unified Next.js and WebSocket Server - Custom Entry Point)
import express, { Request, Response } from 'express'
import { createServer, IncomingMessage } from 'http'
import { Socket } from 'net'
import next from 'next'
import path from 'path'
import { parse } from 'url'
import { WebSocketServer } from 'ws'
import type { WebSocket } from 'ws'
import { AccessToken } from '@spotify/web-api-ts-sdk'

// Service Imports
import { SpotifyClient } from './services/spotify/spotifyClient.js'
import { SpotifyPolling } from './services/spotifyPolling.js'
import TabataTimer from './services/tabataTimer.js'
import { initSocketManager } from './utils/socketManager.js'
import { broadcast } from './utils/broadcast.js'
import { getBaseURL } from './utils/urls.js'
import logger from './utils/logger.js'
import swaggerUi from 'swagger-ui-express'
import swaggerSpec from './lib/swagger.js'

const port: number = process.env.PORT ? +process.env.PORT : 3000
const hostname =
  process.env.NODE_ENV === 'production'
    ? '0.0.0.0'
    : process.env.HOST || '127.0.0.1'

const dev = process.env.NODE_ENV !== 'production'
const app = next({ dev, hostname, port })
const nextRequestHandler = app.getRequestHandler()

logger.info(`Starting server in ${dev ? 'development' : 'production'} mode`)
logger.info(`Environment: NODE_ENV=${process.env.NODE_ENV}`)
logger.info(`NEXTAUTH_URL: ${getBaseURL()}`)
logger.info(`Hostname: ${hostname}, Port: ${port}`)

app
  .prepare()
  .then(async () => {
    const expressApp = express()
    const server = createServer(expressApp)

    if (!dev) {
      const staticPath = path.join(process.cwd(), '.next/static')
      expressApp.use(
        '/_next/static',
        express.static(staticPath, { immutable: true, maxAge: '365d' })
      )
    }

    // 1. Initialize WebSocket Server
    const wss = new WebSocketServer({ noServer: true })

    // 2. Initialize Persistent Services using the new SpotifyClient singleton
    const spotifyClient = SpotifyClient.getInstance(
      process.env.SPOTIFY_CLIENT_ID!,
      process.env.SPOTIFY_CLIENT_SECRET!
    )
    const spotifyService = new SpotifyPolling(broadcast, spotifyClient)
    const tabataService = new TabataTimer(broadcast)

    // Start polling immediately if a valid token was loaded from persistence.
    if (!spotifyClient.isTokenExpired()) {
      logger.info(
        'Valid Spotify token found on startup, starting polling immediately.'
      )
      spotifyService.startPolling()
    } else {
      logger.info(
        'No valid Spotify token on startup. Polling will start after login.'
      )
    }

    // 3. Initialize WebSocket Manager (pass singleton instances)
    initSocketManager(wss, { tabataService, spotifyService, spotifyClient })

    // --- Express Routing ---
    // Add middleware to parse JSON request bodies.
    expressApp.use(express.json())

    // Swagger UI
    expressApp.use(
      '/api-docs',
      swaggerUi.serve,
      swaggerUi.setup(swaggerSpec)
    )

    // Override Next.js handler for the token delivery route to ensure immediate,
    // in-process token updates without relying on file system signals.
    expressApp.post(
      '/api/internal/token-delivery',
      async (req: Request, res: Response) => {
        try {
          const token = req.body as AccessToken
          if (!token || typeof token.access_token !== 'string') {
            return res.status(400).send('Invalid or missing token payload.')
          }

          logger.info(
            'Received new Spotify token via internal delivery endpoint.'
          )
          await spotifyClient.setToken(token)

          // Ensure polling is active now that we have a token.
          spotifyService.startPolling()
          // Trigger an immediate poll to refresh the UI with the latest track.
          spotifyService.forcePollAndBroadcast()

          return res.status(200).send('Token received and service updated.')
        } catch (error) {
          logger.error({ err: error }, 'Error processing token delivery.')
          return res.status(500).send('Internal Server Error')
        }
      }
    )

    // Handle all other requests with the Next.js handler.
    expressApp.all('*', (req: Request, res: Response) => {
      return nextRequestHandler(req, res)
    })

    // --- HTTP/WS Upgrade Handling ---
    server.on(
      'upgrade',
      (req: IncomingMessage, socket: Socket, head: Buffer) => {
        const { pathname } = parse(req.url || '')
        if (pathname === '/ws') {
          wss.handleUpgrade(req, socket, head, (ws: WebSocket) => {
            wss.emit('connection', ws, req)
          })
        }
      }
    )

    // --- Start Server ---
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
