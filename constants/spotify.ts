import { SpotifyDevice } from '@/types/core'

export const SPOTIFY_AUTH_LOOP_GUARD_KEY = 'spotify_auth_loop_guard'
export const SPOTIFY_AUTH_LOOP_GUARD_TIMEOUT = 15000
export const HRM_WEB_PLAYER_NAME = 'HRM Web Player'
/**
 * Default Spotify token expiry in seconds (1 hour).
 * Used as a fallback when Spotify API doesn't provide an expires_in value.
 */
export const SPOTIFY_DEFAULT_TOKEN_EXPIRY_S = 3600

// Centralized constants for Spotify integration
export const VOLUME_SYNC_GRACE_PERIOD_MS = 600
export const SPOTIFY_BRAND_COLOR = '#1DB954'

// Display messages
export const SPOTIFY_MSG_AWAITING_LOGIN = 'Awaiting Login...'
export const SPOTIFY_MSG_NO_TRACK = 'No Track Playing'
export const SPOTIFY_MSG_CONNECT_HRM = 'Connect to HRM Web Player'
