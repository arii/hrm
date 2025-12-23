// Environment
export const DEFAULT_PORT = 3000

// Rate Limiting (in milliseconds)
export const RATE_LIMIT_WINDOW_MS = 1 * 60 * 1000 // 1 minute

// API Rate Limits (requests per window)
export const SPOTIFY_API_MAX_REQUESTS = 30
export const INTERNAL_API_MAX_REQUESTS = 100
export const GENERAL_API_MAX_REQUESTS = 200

// WebSocket
export const WS_MAX_CONNECTIONS_PER_IP = 5

// Spotify
export const SPOTIFY_TOKEN_REFRESH_INTERVAL_MS = 1000 * 60 * 5 // 5 minutes
export const SPOTIFY_DEFAULT_POLLING_INTERVAL_MS = 3000 // 3 seconds
export const SPOTIFY_FETCH_AFTER_COMMAND_DELAY_MS = 500 // 0.5 seconds

// Tabata Timer
export const TABATA_DEFAULT_WORK_DURATION_S = 20
export const TABATA_DEFAULT_REST_DURATION_S = 10
export const TABATA_START_COUNTDOWN_S = 5
