/**
 * @fileoverview Centralized constants for the application.
 *
 * All hardcoded values that are not user-configurable should be defined here
 * to avoid magic numbers and improve maintainability.
 */

// --- General ---
export const DEFAULT_PORT = 3000

// --- API Rate Limiting ---
export const RATE_LIMIT_WINDOW_MS = 15 * 60 * 1000 // 15 minutes
export const GENERAL_API_MAX_REQUESTS = 100
export const SPOTIFY_API_MAX_REQUESTS = 100
export const INTERNAL_API_MAX_REQUESTS = 200

// --- WebSocket ---
export const WS_MAX_CONNECTIONS_PER_IP = 10

// --- Spotify ---
export const SPOTIFY_DEFAULT_POLLING_INTERVAL_MS = 5000
export const SPOTIFY_FETCH_AFTER_COMMAND_DELAY_MS = 500
export const SPOTIFY_TOKEN_REFRESH_INTERVAL_MS = 60 * 1000 // 1 minute

// --- Tabata Timer ---
export const TIMER_BROADCAST_INTERVAL_MS = 1000
export const HRM_BROADCAST_INTERVAL_MS = 1000
