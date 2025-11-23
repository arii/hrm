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
export function shouldPersistSpotifyTokens(): boolean {
  const strategy = process.env.SPOTIFY_TOKEN_CACHE_STRATEGY?.toLowerCase()
  const persistence = process.env.SPOTIFY_TOKEN_PERSISTENCE?.toLowerCase()

  if (strategy === 'persistence' || strategy === 'persistent') {
    return true
  }

  if (persistence === 'true' || persistence === '1') {
    return true
  }

  return false
}
