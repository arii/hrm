// File: server.js (Unified Next.js and WebSocket Server - Custom Entry Point)
/**
 * Description: Custom Node.js HTTP Server that hosts the Next.js application,
 * attaches the persistent WebSocket server, and manages service initialization
 * and internal data endpoints (like NextAuth token delivery).
 */

import express, { Request, Response } from 'express'
import { createServer, IncomingMessage } from 'http'
import { Socket } from 'net'
import next from 'next'
import path from 'path'
import { parse } from 'url'
import type { WebSocket } from 'ws'
import { WebSocketServer } from 'ws'

// Service Imports (Node loads these .ts files via transpilation)
import { SpotifyPolling } from './services/spotifyPolling.js'
import TabataTimer from './services/tabataTimer.js'
import {
  initSocketManager,
  broadcastSpotifyUpdate,
  broadcastTimerUpdate,
} from './utils/socketManager.js'
import { getBaseURL } from './utils/urls.js'

const port: number = process.env.PORT ? +process.env.PORT : 3000
const hostname =
  process.env.NODE_ENV === 'production'
    ? '0.0.0.0'
    : process.env.HOST || '127.0.0.1'

const dev = process.env.NODE_ENV !== 'production'
const app = next({ dev, hostname, port })

console.log(`Starting server in ${dev ? 'development' : 'production'} mode`)
console.log(`Environment: NODE_ENV=${process.env.NODE_ENV}`)
console.log(`NEXTAUTH_URL: ${getBaseURL()}`)
console.log(`Hostname: ${hostname}, Port: ${port}`)
const handle = app.getRequestHandler()

const expressApp = express()

app
  .prepare()
  .then(async () => {
    const server = createServer(expressApp)

    if (!dev) {
      const staticPath = path.join(process.cwd(), '.next/static')
      console.log(`Serving static files from: ${staticPath}`)
      expressApp.use(
        '/_next/static',
        express.static(staticPath, {
          immutable: true,
          maxAge: '365d',
        })
      )
    }

    const wss = new WebSocketServer({ noServer: true })

    let spotifyServiceInitialized: boolean = true
    let spotifyService: SpotifyPolling

    try {
      // Pass the topic-specific broadcaster to the service
      spotifyService = await SpotifyPolling.create(broadcastSpotifyUpdate)
    } catch (e) {
      console.error('SpotifyPolling initialization failed:', e)
      spotifyServiceInitialized = false
      spotifyService = {
        handleCommand: () => {},
        stopPolling: () => {},
        startPolling: () => {},
        setRefreshToken: () => {},
        forcePollAndBroadcast: async () => {}, // Add this line
        getAvailableDevices: async () => [], // Add this line
        getState: () => ({
          trackName: 'Error',
          artist: 'Service not available',
          isPlaying: false,
        }), // Add this line
      } as unknown as SpotifyPolling
    }

    // Pass the topic-specific broadcaster to the service
    const tabataService = new TabataTimer(broadcastTimerUpdate)

    initSocketManager(wss, { tabataService, spotifyService }, spotifyServiceInitialized)

    expressApp.get(
      '/api/spotify/devices',
      async (req: Request, res: Response) => {
        if (!spotifyServiceInitialized || !spotifyService) {
          return res
            .status(503)
            .json({ error: 'Spotify service not initialized.' })
        }
        try {
          const devices = await spotifyService.getAvailableDevices()
          return res.json(devices)
        } catch (error) {
          console.error('Error fetching Spotify devices via API:', error)
          return res
            .status(500)
            .json({ error: 'Failed to fetch Spotify devices.' })
        }
      }
    )

    expressApp.use(async (req: Request, res: Response) => {
      if (
        req.method === 'POST' &&
        req.url &&
        req.url.includes('/api/internal/token-delivery')
      ) {
        setTimeout(async () => {
          if (spotifyService) {
            // Signal the service to reload tokens from disk
            spotifyService.setRefreshToken('signal')

            // Wait a bit for reload, then force poll
            setTimeout(async () => {
              if (typeof spotifyService.forcePollAndBroadcast === 'function') {
                await spotifyService.forcePollAndBroadcast()
              }
            }, 1500)
          }
        }, 1000)
      }
      return handle(req, res)
    })

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

    server.on('error', (err: Error) => {
      console.error('Server error:', err)
      process.exit(1)
    })

    server.listen(port, hostname, () => {
      console.log(`> Ready on http://${hostname}:${port}`)
      console.log(`> WebSocket Server listening on ws://${hostname}:${port}/ws`)
    })
  })
  .catch((err: Error) => {
    console.error('Next.js preparation failed:', err.stack)
    process.exit(1)
  })
