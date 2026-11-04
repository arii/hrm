export const SPOTIFY_AUTH_LOOP_GUARD_KEY = 'spotify_auth_loop_guard'
export const SPOTIFY_AUTH_LOOP_GUARD_TIMEOUT = 15000
export const HRM_WEB_PLAYER_NAME = 'HRM Web Player'

// Spotify's device list flaps SDK devices in and out poll-to-poll
// (backgrounded tabs), so latched server truth requires this many
// consecutive negative polls before flipping false.
export const STABLE_ACTIVE_POLLS = 3

// Auto-transfer cooldown, shared across tabs and reloads: the SDK mints a
// new device id on every mount, so auto-transfer is rate-limited by time,
// not by id.
export const AUTO_TRANSFER_COOLDOWN_KEY = 'hrm-spotify-auto-transfer-at'
export const AUTO_TRANSFER_COOLDOWN_MS = 60_000
/**
 * Default Spotify token expiry in seconds (1 hour).
 * Used as a fallback when Spotify API doesn't provide an expires_in value.
 */
export const SPOTIFY_DEFAULT_TOKEN_EXPIRY_S = 3600

// Centralized constants for Spotify integration
export const VOLUME_SYNC_GRACE_PERIOD_MS = 3000
export const SPOTIFY_BRAND_COLOR = '#1DB954'
