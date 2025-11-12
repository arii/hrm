// File: server.js (Unified Next.js and WebSocket Server - Custom Entry Point)
/**
 * Description: Custom Node.js HTTP Server that hosts the Next.js application,
 * attaches the persistent WebSocket server, and manages service initialization
 * and internal data endpoints (like NextAuth token delivery).
 */

import express, { Request, Response } from "express";
import { createServer, IncomingMessage } from "http";
import { Socket } from "net";
import next from "next";
import path from "path";
import { parse } from "url";
import type { WebSocket } from "ws"; // Import WebSocket as a type
import { WebSocketServer } from "ws";
import { UnifiedStateMessage } from "./types/websocket.js";

// Service Imports (Node loads these .ts files via transpilation)
import SpotifyPolling from "./services/spotifyPolling.js";
import TabataTimer from "./services/tabataTimer.js";
import { initSocketManager } from "./utils/socketManager.js";
import { createSpotifyRouter } from './services/spotifyRoutes.js';

const port: number = process.env.PORT ? +process.env.PORT : 3000; // Explicitly handle undefined and convert to number
// Allow overriding bind address via the HOST env var for flexibility in CI/containers
const hostname =
  process.env.NODE_ENV === "production"
    ? "0.0.0.0"
    : process.env.HOST || "127.0.0.1"; // Bind to all interfaces in production

const dev = process.env.NODE_ENV !== "production";
const app = next({ dev, hostname, port });

console.log(`Starting server in ${dev ? "development" : "production"} mode`);
console.log(`Environment: NODE_ENV=${process.env.NODE_ENV}`);
console.log(`NEXTAUTH_URL: ${process.env.NEXTAUTH_URL}`);
console.log(`Hostname: ${hostname}, Port: ${port}`);
const handle = app.getRequestHandler();

// Create Express app for routing and middleware
const expressApp = express();

// --- Main Application Setup ---

app
  .prepare()
  .then(() => {
    const server = createServer(expressApp);

    // --- Static Asset Serving (Production Only) ---
    // In production, serve the Next.js static assets directly from the .next/static folder.
    // This is more efficient than letting the Next.js handler do it.
    if (!dev) {
      const staticPath = path.join(process.cwd(), ".next/static");
      console.log(`Serving static files from: ${staticPath}`);

      expressApp.use(
        "/_next/static",
        express.static(staticPath, {
          // All files in _next/static have content hashes, so they can be cached indefinitely.
          immutable: true,
          maxAge: "365d",
        })
      );
    }

    // 1. Initialize WebSocket Server
    const wss = new WebSocketServer({ noServer: true });

    // Declare spotifyServiceInitialized here
    let spotifyServiceInitialized: boolean = true;

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
                type: "STATE_UPDATE",
                spotifyServiceInitialized,
                ...data,
              })
            ); // Include spotifyServiceInitialized
          }
        });
      }
    };

    // 2. Initialize Persistent Services
    let spotifyService: SpotifyPolling;
    try {
      spotifyService = new SpotifyPolling(broadcastState);
    } catch (e) {
      console.error("SpotifyPolling initialization failed:", e);
      spotifyServiceInitialized = false; // Set to false on failure
      // Fallback stub to avoid crashing entire server if Spotify setup fails
      spotifyService = {
        handleCommand: () => {},
        stopPolling: () => {},
        startPolling: () => {},
        setRefreshToken: () => {},
      } as unknown as SpotifyPolling;
    }
    const tabataService = new TabataTimer(broadcastState);

    // 3. Initialize WebSocket Manager (to handle commands and connections)
    initSocketManager(wss, { tabataService, spotifyService });

    // --- Express Routing ---

    // Modular Spotify routes
    const spotifyRouter = createSpotifyRouter(spotifyService, () => spotifyServiceInitialized);
    expressApp.use('/api/spotify', spotifyRouter);

    // Handle all Next.js routing (pages, API routes, etc.)
    // Token delivery is handled by Next.js API route at /api/internal/token-delivery
    expressApp.use((req: Request, res: Response) => {
      return handle(req, res);
    }); // --- HTTP/WS Upgrade Handling ---

    // Attach the WebSocket server to the HTTP server instance using the 'upgrade' event
    server.on(
      "upgrade",
      (req: IncomingMessage, socket: Socket, head: Buffer) => {
        const { pathname } = parse(req.url || "");

        // Only upgrade connections to the specific WebSocket path
        if (pathname === "/ws") {
          wss.handleUpgrade(req, socket, head, (ws: WebSocket) => {
            wss.emit("connection", ws, req);
          });
        }
        // If not our WebSocket path, simply return and let other upgrade handlers (e.g., Next.js's) take over.
        // DO NOT re-emit "upgrade" as it can lead to infinite recursion.
      }
    );

    // --- Start Server ---

    // Handle server errors (e.g., port already in use)
    server.on("error", (err: Error) => {
      console.error("Server error:", err);
      process.exit(1);
    });

    // Begin listening
    server.listen(port, hostname, () => {
      // This callback only runs on successful listening
      console.log(`> Ready on http://${hostname}:${port}`);
      console.log(
        `> WebSocket Server listening on ws://${hostname}:${port}/ws`
      );
    });
  })
  .catch((err: Error) => {
    console.error("Next.js preparation failed:", err.stack);
    process.exit(1);
  });
