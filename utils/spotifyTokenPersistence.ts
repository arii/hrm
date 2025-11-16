// File: utils/spotifyTokenPersistence.ts (Spotify token persistence helpers)
/**
 * Determines whether Spotify tokens should persist across server restarts.
 * The default is "ephemeral" which clears any cached token file on boot.
 *
 * Supported environment variables:
 *   SPOTIFY_TOKEN_CACHE_STRATEGY
 *   SPOTIFY_TOKEN_PERSISTENCE
 *
 * Accepted truthy values for persistence: persistent, persist, keep, retain, true, 1
 */
export type SpotifyTokenPersistenceMode = 'persistent' | 'ephemeral'

const PERSISTENT_VALUES = new Set([
  'persistent',
  'persist',
  'keep',
  'retain',
  'true',
  '1',
])

const getRawPersistenceValue = (): string => {
  const explicit = process.env.SPOTIFY_TOKEN_CACHE_STRATEGY
  if (explicit && explicit.trim()) {
    return explicit.trim().toLowerCase()
  }

  const legacy = process.env.SPOTIFY_TOKEN_PERSISTENCE
  if (legacy && legacy.trim()) {
    return legacy.trim().toLowerCase()
  }

  return ''
}

export const getSpotifyTokenPersistenceMode = (): SpotifyTokenPersistenceMode => {
  const raw = getRawPersistenceValue()
  return PERSISTENT_VALUES.has(raw) ? 'persistent' : 'ephemeral'
}

export const shouldPersistSpotifyTokens = (): boolean => {
  return getSpotifyTokenPersistenceMode() === 'persistent'
}
