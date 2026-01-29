# WebSocket Architecture

This document provides a detailed overview of the WebSocket architecture in the HRM Dashboard application.

## Overview

The WebSocket server is an integral part of the application, providing real-time communication between the server and connected clients. It is responsible for transmitting heart rate data, timer updates, and other state changes to all connected clients.

## Server-Side Implementation

The server-side WebSocket implementation is built on top of the `ws` library and is tightly integrated with the custom Express server.

### Key Files & Responsibilities

The server-side WebSocket logic is decoupled into three main modules, each with a distinct responsibility:

- **`lib/websocket.ts` (`WebSocketManager`)**: This class is the foundational layer. Its primary role is to create the `WebSocketServer` instance and handle the initial HTTP `upgrade` request from the client, effectively establishing the WebSocket connection. It provides a generic `createBroadcaster` method that other services can use to send messages to all clients without needing to know the implementation details.

- **`utils/socketManager.ts` (`initSocketManager`)**: This module acts as the "controller" for the WebSocket server. It contains the core application logic for what happens *after* a connection is established. It is initialized by `server.ts` and receives the `WebSocketServer` instance created by `WebSocketManager`. Its responsibilities include:
    - Handling the `connection` event.
    - Managing the lifecycle of individual client sessions (e.g., registration, state initialization).
    - Routing incoming client messages to the appropriate services or handlers.
    - Triggering state broadcasts.

- **`utils/websocketUtils.ts` (`ConnectionMonitor`)**: This module provides specialized utilities, most notably the `ConnectionMonitor` class. This class is instantiated and managed by `socketManager.ts`. Its sole purpose is to prevent memory leaks from "zombie" connections by:
    - Running a periodic "watchdog" timer.
    - Sending `ping` frames to all clients at a regular interval.
    - Terminating connections that fail to respond with a `pong` frame in a timely manner.

This separation of concerns ensures that the low-level connection handling (`WebSocketManager`) is distinct from the application's business logic (`socketManager.ts`) and the connection health checks (`ConnectionMonitor`).

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
