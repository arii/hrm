// File: server.js (Unified Next.js and WebSocket Server - Custom Entry Point)
/**
 * Description: Custom Node.js HTTP Server that hosts the Next.js application, 
 * attaches the persistent WebSocket server, and manages service initialization 
 * and internal data endpoints (like NextAuth token delivery).
 */
import { createServer, IncomingMessage } from 'http';
import { parse } from 'url';
import next from 'next';
import express from 'express';
import { WebSocket } from 'ws'; // Import WebSocket as a type
const { Server } = require('ws'); // Import Server as a value using require
import { Request, Response } from 'express';
import { Socket } from 'net';

// Service Imports (Node loads these .ts files via transpilation)
const { initSocketManager } = require('./utils/socketManager');
const TabataTimer = require('./services/tabataTimer').default;
const SpotifyPolling = require('./services/spotifyPolling').default;

const port: number = process.env.PORT ? +process.env.PORT : 3000; // Explicitly handle undefined and convert to number
// Allow overriding bind address via the HOST env var for flexibility in CI/containers
const hostname = process.env.HOST || '127.0.0.1'; // CRITICAL: Bind explicitly to localhost IP for consistency

const dev = process.env.NODE_ENV !== 'production';
const app = next({ dev, hostname, port });
const handle = app.getRequestHandler();

// Create Express app for routing and middleware
const expressApp = express();

// --- Main Application Setup ---

app.prepare().then(() => {
    const server = createServer(expressApp);

    // 1. Initialize WebSocket Server
    const wss = new Server({ noServer: true });
    
    // Function to safely broadcast state from services (Used by Tabata and Spotify services)
    const broadcastState = (data: any) => {
        // Use the socket manager to handle the actual broadcast
        if (wss.clients.size > 0) {
            wss.clients.forEach((client: WebSocket) => {
                if (client.readyState === 1) { // 1 means OPEN
                    // Note: We use the STATE_UPDATE type defined in types/websocket.ts
                    client.send(JSON.stringify({ type: 'STATE_UPDATE', ...data }));
                }
            });
        }
    };
    
    // 2. Initialize Persistent Services
    const spotifyService = new SpotifyPolling(broadcastState);
    const tabataService = new TabataTimer(broadcastState);

    // 3. Initialize WebSocket Manager (to handle commands and connections)
    initSocketManager(wss, { tabataService, spotifyService });

    // --- Express Routing ---

    // Internal Token Delivery Endpoint (Handles NextAuth callback)
    // NOTE: This must be placed BEFORE expressApp.all('*', ...)
    expressApp.post('/internal/token-delivery', express.json(), (req: Request, res: Response) => {
        const { refreshToken } = req.body;
        if (refreshToken) {
            // Pass the long-lived token to the persistent service instance
            spotifyService.setRefreshToken(refreshToken); 
            res.status(200).send({ success: true });
        } else {
            res.status(400).send({ success: false, message: 'No refresh token provided.' });
        }
    });

    // Handle all other Next.js routing (pages, API routes, etc.)
    expressApp.use((req: Request, res: Response) => {
        return handle(req, res);
    });

    // --- HTTP/WS Upgrade Handling ---
    
    // Attach the WebSocket server to the HTTP server instance using the 'upgrade' event
    server.on('upgrade', (req: IncomingMessage, socket: Socket, head: Buffer) => {
        const { pathname } = parse(req.url || '');

        // Only upgrade connections to the specific WebSocket path
        if (pathname === '/ws') {
            wss.handleUpgrade(req, socket, head, (ws: WebSocket) => {
                wss.emit('connection', ws, req);
            });
        } else {
            // Destroy socket for unauthorized/non-websocket paths (security)
            socket.destroy();
        }
    });

    // @ts-ignore
    server.listen(port as number, hostname, (err: Error) => {
        if (err) throw err;
        console.log(`> Ready on http://${hostname}:${port}`);
        console.log(`> WebSocket Server listening on ws://${hostname}:${port}/ws`);
    });
}).catch((err: Error) => {
    console.error('Next.js preparation failed:', err.stack);
    process.exit(1);
});