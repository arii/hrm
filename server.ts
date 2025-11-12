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
import type { WebSocket } from 'ws' // Import WebSocket as a type
import { WebSocketServer } from 'ws'
import { UnifiedStateMessage } from './types/websocket'

// Service Imports (Node loads these .ts files via transpilation)
import SpotifyPolling from './services/spotifyPolling.js'
import TabataTimer from './services/tabataTimer.js'
import { initSocketManager } from './utils/socketManager.js'

const port: number = process.env.PORT ? +process.env.PORT : 3000 // Explicitly handle undefined and convert to number
// Allow overriding bind address via the HOST env var for flexibility in CI/containers
const hostname =
  process.env.NODE_ENV === 'production'
    ? '0.0.0.0'
    : process.env.HOST || '127.0.0.1' // Bind to all interfaces in production

const dev = process.env.NODE_ENV !== 'production'
const app = next({ dev, hostname, port })

console.log(`Starting server in ${dev ? 'development' : 'production'} mode`)
console.log(`Environment: NODE_ENV=${process.env.NODE_ENV}`)
console.log(`NEXTAUTH_URL: ${process.env.NEXTAUTH_URL}`)
console.log(`Hostname: ${hostname}, Port: ${port}`)
const handle = app.getRequestHandler()

// Create Express app for routing and middleware
const expressApp = express()

// --- Main Application Setup ---

app
  .prepare()
  .then(() => {
    const server = createServer(expressApp)

    // --- Static Asset Serving (Production Only) ---
    // In production, serve the Next.js static assets directly from the .next/static folder.
    // This is more efficient than letting the Next.js handler do it.
    if (!dev) {
      const staticPath = path.join(process.cwd(), '.next/static')
      console.log(`Serving static files from: ${staticPath}`)

      expressApp.use(
        '/_next/static',
        express.static(staticPath, {
          // All files in _next/static have content hashes, so they can be cached indefinitely.
          immutable: true,
          maxAge: '365d',
        })
      )
    }

    // 1. Initialize WebSocket Server
    const wss = new WebSocketServer({ noServer: true })

    // Declare spotifyServiceInitialized here
    let spotifyServiceInitialized: boolean = true

    // Function to safely broadcast state from services (Used by Tabata and Spotify services)
    const broadcastState = (data: Partial<UnifiedStateMessage>): void => {
      // Use the socket manager to handle the actual broadcast
      if (wss.clients.size > 0) {
        wss.clients.forEach((client: WebSocket) => {
          if (client.readyState === 1) {
            // 1 means OPEN
            // Note: We use the STATE_UPDATE type defined in types/websocket.ts
            client.send(
              JSON.stringify({
                type: 'STATE_UPDATE',
                spotifyServiceInitialized,
                ...data,
              })
            ) // Include spotifyServiceInitialized
          }
        })
      }
    }

    // 2. Initialize Persistent Services
    let spotifyService: SpotifyPolling
    try {
      spotifyService = new SpotifyPolling(broadcastState)
    } catch (e) {
      console.error('SpotifyPolling initialization failed:', e)
      spotifyServiceInitialized = false // Set to false on failure
      // Fallback stub to avoid crashing entire server if Spotify setup fails
      spotifyService = {
        handleCommand: () => {},
        stopPolling: () => {},
        startPolling: () => {},
        setRefreshToken: () => {},
      } as unknown as SpotifyPolling
    }
    const tabataService = new TabataTimer(broadcastState)

    // 3. Initialize WebSocket Manager (to handle commands and connections)
    initSocketManager(wss, { tabataService, spotifyService })

    // --- Express Routing ---

    // API endpoint for Strava Authentication
    expressApp.get('/api/strava/auth', (req: Request, res: Response) => {
      const stravaClientId = process.env.STRAVA_CLIENT_ID;
      if (!stravaClientId) {
        res.status(500).send('STRAVA_CLIENT_ID is not configured on the server.');
        return;
      }
      const redirectUri = process.env.STRAVA_REDIRECT_URI || `http://${hostname}:${port}/api/strava/callback`;
      const scope = 'read,activity:write';
      const authUrl = `https://www.strava.com/oauth/authorize?client_id=${stravaClientId}&redirect_uri=${redirectUri}&response_type=code&scope=${scope}&approval_prompt=force`;
      res.redirect(authUrl);
    });

    expressApp.get('/api/strava/callback', async (req: Request, res: Response) => {
        const { code, error } = req.query;

        if (error) {
            console.error('Strava OAuth Error:', error);
            return res.status(500).send(`Strava OAuth Error: ${error}`);
        }

        if (!code) {
            return res.status(400).send('Missing authorization code from Strava.');
        }

        try {
            const stravaClientId = process.env.STRAVA_CLIENT_ID;
            const stravaClientSecret = process.env.STRAVA_CLIENT_SECRET;
            if (!stravaClientId || !stravaClientSecret) {
              res.status(500).send('Strava client ID or secret is not configured on the server.');
              return;
            }

            const response = await fetch('https://www.strava.com/oauth/token', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                },
                body: new URLSearchParams({
                    client_id: stravaClientId,
                    client_secret: stravaClientSecret,
                    code: code as string,
                    grant_type: 'authorization_code',
                }),
            });

            if (!response.ok) {
                const errorBody = await response.text();
                throw new Error(`Strava token exchange failed: ${errorBody}`);
            }

            const tokenData = await response.json();
            const { access_token, refresh_token, expires_in, athlete } = tokenData;
            const expiresAt = Date.now() + expires_in * 1000;

            // Set the refresh token in a secure, HttpOnly cookie
            res.cookie('strava_refresh_token', refresh_token, {
                httpOnly: true,
                secure: process.env.NODE_ENV === 'production',
                maxAge: 365 * 24 * 60 * 60 * 1000, // 1 year
                path: '/',
            });

            // Set the access token and expiry in regular cookies for client-side access
            res.cookie('strava_access_token', access_token, {
                secure: process.env.NODE_ENV === 'production',
                maxAge: expires_in * 1000,
                path: '/',
            });

            res.cookie('strava_expires_at', expiresAt.toString(), {
                secure: process.env.NODE_ENV === 'production',
                maxAge: expires_in * 1000,
                path: '/',
            });

            res.cookie('strava_athlete_id', athlete.id.toString(), {
                secure: process.env.NODE_ENV === 'production',
                maxAge: 365 * 24 * 60 * 60 * 1000, // 1 year, for display
                path: '/',
            });

            // Redirect user back to the connect page
            res.redirect('/client/connect');
        } catch (err: any) {
            console.error('Error in Strava callback:', err);
            res.status(500).send('An error occurred during Strava authentication.');
        }
    });

    // API endpoint to get available Spotify devices
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

    // Handle all Next.js routing (pages, API routes, etc.)
    // Token delivery is handled by Next.js API route at /api/internal/token-delivery
    expressApp.use((req: Request, res: Response) => {
      return handle(req, res)
    }) // --- HTTP/WS Upgrade Handling ---

    // Attach the WebSocket server to the HTTP server instance using the 'upgrade' event
    server.on(
      'upgrade',
      (req: IncomingMessage, socket: Socket, head: Buffer) => {
        const { pathname } = parse(req.url || '')

        // Only upgrade connections to the specific WebSocket path
        if (pathname === '/ws') {
          wss.handleUpgrade(req, socket, head, (ws: WebSocket) => {
            wss.emit('connection', ws, req)
          })
        }
        // If not our WebSocket path, simply return and let other upgrade handlers (e.g., Next.js's) take over.
        // DO NOT re-emit "upgrade" as it can lead to infinite recursion.
      }
    )

    // --- Start Server ---

    // Handle server errors (e.g., port already in use)
    server.on('error', (err: Error) => {
      console.error('Server error:', err)
      process.exit(1)
    })

    // Begin listening
    server.listen(port, hostname, () => {
      // This callback only runs on successful listening
      console.log(`> Ready on http://${hostname}:${port}`)
      console.log(`> WebSocket Server listening on ws://${hostname}:${port}/ws`)
    })
  })
  .catch((err: Error) => {
    console.error('Next.js preparation failed:', err.stack)
    process.exit(1)
  })
