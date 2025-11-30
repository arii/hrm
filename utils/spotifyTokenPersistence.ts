/**
 * Determines whether Spotify tokens should be persisted to the filesystem.
 *
 * Persistence is enabled if either of the following environment variables are set to a truthy value (e.g., 'true', '1'):
 * - `SPOTIFY_TOKEN_PERSISTENCE`: An explicit flag to enable saving tokens.
 * - `SPOTIFY_TOKEN_CACHE_STRATEGY`: A legacy or alternative flag that also implies persistence.
 *
 * @returns {boolean} True if tokens should be persisted, false otherwise.
 */
export function shouldPersistSpotifyTokens(): boolean {
  const persistenceFlag = process.env.SPOTIFY_TOKEN_PERSISTENCE
  const cacheStrategy = process.env.SPOTIFY_TOKEN_CACHE_STRATEGY

  const isPersistenceEnabled =
    (persistenceFlag && ['true', '1'].includes(persistenceFlag.toLowerCase())) ||
    cacheStrategy === 'persistence'

  return isPersistenceEnabled
}
