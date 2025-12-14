/**
 * @fileoverview Centralized configuration management for the application.
 *
 * This module provides a single source of truth for configuration values,
 * abstracting away the direct use of `process.env`. It offers sensible
 * defaults for development environments while allowing for flexible overrides
 * in production and testing scenarios.
 *
 * @see docs/ENVIRONMENT_VARIABLES.md for a complete list of environment variables.
 */

const PORT = parseInt(process.env.PORT || '3000', 10)
const HOST =
  process.env.HOST ||
  (process.env.NODE_ENV === 'production' ? '0.0.0.0' : '127.0.0.1')
const NEXTAUTH_URL =
  process.env.NEXTAUTH_URL || `http://${HOST}:${PORT}`

export const config = {
  /**
   * Server-related configurations.
   */
  server: {
    /** The port number for the HTTP server. */
    port: PORT,
    /** The hostname or IP address for the server to bind to. */
    host: HOST,
  },
  /**
   * WebSocket-related configurations.
   */
  websocket: {
    /** The full URL for WebSocket connections, used by clients. */
    url: process.env.WEBSOCKET_URL || `ws://${HOST}:${PORT}/ws`,
  },
  /**
   * Application-level configurations.
   */
  app: {
    /** The base URL for the Next.js application, used for auth redirects, etc. */
    baseUrl: NEXTAUTH_URL,
  },
  /**
   * Test-specific configurations.
   */
  test: {
    /** The base URL for running tests, especially Playwright. */
    baseUrl: process.env.TEST_BASE_URL || `http://localhost:${PORT}`,
    /** Default timeout for test operations in milliseconds. */
    timeout: parseInt(process.env.TEST_TIMEOUT || '30000', 10),
  },
}
