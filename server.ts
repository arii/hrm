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
import { parse } from "url";
import type { WebSocket } from "ws"; // Import WebSocket as a type
import { WebSocketServer } from "ws";
import type { UnifiedStateMessage } from "./types/websocket";

// Service Imports (Node loads these .ts files via transpilation)
import SpotifyPolling from "./services/spotifyPolling";
import TabataTimer from "./services/tabataTimer";
import { initSocketManager } from "./utils/socketManager";

const port: number = process.env.PORT ? +process.env.PORT : 3000; // Explicitly handle undefined and convert to number
// Allow overriding bind address via the HOST env var for flexibility in CI/containers
const hostname = process.env.HOST || "127.0.0.1"; // CRITICAL: Bind explicitly to localhost IP for consistency

const dev = process.env.NODE_ENV !== "production";
const app = next({ dev, hostname, port });
const handle = app.getRequestHandler();

// Create Express app for routing and middleware
const expressApp = express();

// --- Main Application Setup ---

app
  .prepare()
  .then(() => {
    const server = createServer(expressApp);

    // 1. Initialize WebSocket Server
    const wss = new WebSocketServer({ noServer: true });

    // Function to safely broadcast state from services (Used by Tabata and Spotify services)
    const broadcastState = (data: Partial<UnifiedStateMessage>): void => {
      // Use the socket manager to handle the actual broadcast
      if (wss.clients.size > 0) {
        wss.clients.forEach((client: WebSocket) => {
          if (client.readyState === 1) {
            // 1 means OPEN
            // Note: We use the STATE_UPDATE type defined in types/websocket.ts
            client.send(JSON.stringify({ type: "STATE_UPDATE", ...data }));
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
    expressApp.post(
      "/internal/token-delivery",
      express.json(),
      (req: Request, res: Response) => {
        const { refreshToken } = req.body;
        if (refreshToken) {
          // Pass the long-lived token to the persistent service instance
          spotifyService.setRefreshToken(refreshToken);
          res.status(200).send({ success: true });
        } else {
          res
            .status(400)
            .send({ success: false, message: "No refresh token provided." });
        }
      }
    );

    // Handle all other Next.js routing (pages, API routes, etc.)
    expressApp.use((req: Request, res: Response) => {
      return handle(req, res);
    });

    // --- HTTP/WS Upgrade Handling ---

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
        } else {
          // Destroy socket for unauthorized/non-websocket paths (security)
          socket.destroy();
        }
      }
    );

    // --- Start Server ---

    // Handle server errors (e.g., port already in use)
    server.on('error', (err: Error) => {
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