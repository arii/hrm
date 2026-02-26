export const SPOTIFY_AUTH_LOOP_GUARD_KEY = 'spotify_auth_loop_guard'
export const SPOTIFY_AUTH_LOOP_GUARD_TIMEOUT = 15000
export const HRM_WEB_PLAYER_NAME = 'HRM Web Player'
/**
 * Default Spotify token expiry in seconds (1 hour).
 * Used as a fallback when Spotify API doesn't provide an expires_in value.
 */
export const SPOTIFY_DEFAULT_TOKEN_EXPIRY_S = 3600

// Centralized constants for Spotify integration
export const SYNC_LOCK_DURATION = 2000 // 2s lock to allow API propagation

// Polling stability constants
export const POLLING_COOLDOWN_MS = 2000 // Ignore polls for 2s after a command
export const POLLING_FORCE_UPDATE_DELAY_MS = POLLING_COOLDOWN_MS + 100 // Force update after cooldown expires
