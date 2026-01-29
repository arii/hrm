# WebSocket Architecture

This document provides a detailed overview of the WebSocket architecture in the HRM Dashboard application.

## Overview

The WebSocket server is an integral part of the application, providing real-time communication between the server and connected clients. It is responsible for transmitting heart rate data, timer updates, and other state changes to all connected clients.

## Server-Side Implementation

The server-side WebSocket implementation is built on top of the `ws` library and is tightly integrated with the custom Express server.

### Key Files

- **`server.ts`**: The main entry point of the application. It creates the Express server and the WebSocket server, and it handles the upgrade of HTTP connections to WebSocket connections.
- **`lib/websocket.ts`**: This file contains the `WebSocketManager` class, which is responsible for creating the WebSocket server and broadcasting messages to connected clients.
- **`utils/socketManager.ts`**: This file contains the core logic for managing WebSocket connections. It handles client connections, disconnections, and incoming messages.
- **`utils/websocketUtils.ts`**: This file contains utility functions for sending and broadcasting WebSocket messages, as well as the `ConnectionMonitor` class for terminating stale connections.

### Connection Management

When a client connects to the WebSocket server, the `initSocketManager` function in `utils/socketManager.ts` is called. This function sets up event listeners for `message` and `close` events, and it adds the client to a map of connected clients.

To prevent memory leaks from stale connections, the `ConnectionMonitor` class in `utils/websocketUtils.ts` periodically checks for unresponsive clients and terminates their connections. This is done using a heartbeat mechanism, where the server sends a `ping` message to each client and expects a `pong` message in response. If a client does not respond within a certain time frame, its connection is terminated.

### Message Handling

Incoming messages from clients are handled by the `handleIncomingMessage` function in `utils/socketManager.ts`. This function parses the message, validates it against a Zod schema, and then performs the appropriate action based on the message type.

## Client-Side Implementation

The client-side WebSocket implementation is handled by the `WebSocketContext` in `context/WebSocketContext.tsx`. This context provides a simple interface for sending and receiving WebSocket messages, and it automatically handles connection and reconnection logic.

### Key Files

- **`context/WebSocketContext.tsx`**: This file contains the `WebSocketProvider` component, which creates the WebSocket connection and provides it to all child components.
- **`hooks/useWebSocket.ts`**: This custom hook provides a simple way for components to access the WebSocket context and send and receive messages.

## Environment Variables

The following environment variables are used to configure the WebSocket server:

- **`WEBSOCKET_GRACE_PERIOD_MS`**: The time in milliseconds the server will wait before cleaning up a disconnected client's session data.
- **`WEBSOCKET_WATCHDOG_INTERVAL`**: The interval in milliseconds at which the server's "watchdog" process runs to check for and terminate stale connections.
- **`WS_MAX_CONNECTIONS`**: The maximum number of concurrent WebSocket connections allowed from a single IP address.
