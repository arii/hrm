// File: constants/spotify.ts
/**
 * Spotify-related constants.
 */

export const HRM_WEB_PLAYER_NAME = 'HRM Web Player'
export const SPOTIFY_API_BASE_URL = 'https://api.spotify.com/v1'
export const SPOTIFY_TOKEN_URL = 'https://accounts.spotify.com/api/token'

// The grace period in milliseconds to wait after sending a volume command before syncing from the server.
export const SPOTIFY_VOLUME_GRACE_PERIOD_MS = 500

// The delay in milliseconds to wait after a Spotify command before re-polling.
export const SPOTIFY_POLLING_DELAY_MS = 500
