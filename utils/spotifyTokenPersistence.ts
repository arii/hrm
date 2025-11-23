/**
 * Determines whether Spotify tokens should be persisted to disk.
 *
 * Checks the following environment variables:
 * - SPOTIFY_TOKEN_CACHE_STRATEGY: 'persistence' or 'persistent' enables persistence.
 * - SPOTIFY_TOKEN_PERSISTENCE: 'true' or '1' enables persistence.
 *
 * Defaults to false (ephemeral mode).
 *
 * @returns {boolean} True if persistence is enabled, false otherwise.
 */
import { env } from '../lib/env'

export function shouldPersistSpotifyTokens(): boolean {
  const strategy = env.SPOTIFY_TOKEN_CACHE_STRATEGY?.toLowerCase()
  const persistence = env.SPOTIFY_TOKEN_PERSISTENCE

  if (strategy === 'persistence' || strategy === 'persistent') {
    return true
  }

  if (persistence) {
    return true
  }

  return false
}
