import { env } from '../lib/env'
import { SpotifyTokenManager } from './spotifyTokenManager'
import path from 'path'

// Default to ./logs directory for token persistence if needed
const logDir = path.resolve(process.cwd(), 'logs')

/**
 * Singleton instance of the SpotifyTokenManager.
 * This ensures that the same token manager instance is used across the application,
 * including in Next.js API routes and the persistent WebSocket server,
 * allowing for in-memory token management without file I/O race conditions.
 */
export const spotifyTokenManager = new SpotifyTokenManager(
  env.SPOTIFY_CLIENT_ID,
  env.SPOTIFY_CLIENT_SECRET,
  logDir
)
