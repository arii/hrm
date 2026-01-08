// lib/errors.ts
import { logger } from '../utils/logger.js'

/**
 * Custom error class for API-related errors.
 * This allows for specific error handling and consistent response formatting.
 */
export class ApiError extends Error {
  statusCode: number

  constructor(statusCode: number, message: string) {
    super(message)
    this.name = 'ApiError'
    this.statusCode = statusCode
  }
}

/**
 * A centralized dictionary of error messages for the application.
 * This approach improves maintainability and ensures consistency.
 */
export const ERROR_MESSAGES = {
  // Spotify API Errors
  SPOTIFY_NO_ACTIVE_DEVICE:
    'Spotify command failed: No active device found. Playback cannot be controlled.',
  SPOTIFY_SYNTAX_ERROR:
    'Command executed, but response was not valid JSON (likely 204 No Content). SyntaxError suppressed.',
  SPOTIFY_CMD_EXEC_ERROR: 'Error executing Spotify command',
  SPOTIFY_CMD_RESPONSE_ERROR:
    'Could not read response body for failed Spotify command',
  SPOTIFY_RATE_LIMITED: 'Spotify API Rate Limited. Backing off...',
  SPOTIFY_TOKEN_EXPIRED:
    'Spotify token expired during polling. Attempting refresh.',
  SPOTIFY_POLLING_NETWORK_ERROR:
    'Temporary network connectivity issue during Spotify polling (suppressed)',
  SPOTIFY_POLLING_UNHANDLED_ERROR: 'Unhandled Spotify API error during polling',
  SPOTIFY_FETCH_TRACK_ERROR: 'Error fetching currently playing track',

  // Google Docs Errors
  GOOGLE_DOC_NO_TABLE: 'No table found in the Google Doc',

  // Network and Fetch Errors (from fetchWithRetry)
  NETWORK_TIMEOUT: 'The request timed out.',
  NETWORK_ERROR: 'An unknown network error occurred.',
  FETCH_ABORTED: 'Request was aborted by the caller.',
  UNKNOWN_FETCH_FAILURE: 'The request failed for an unknown reason.',
  HTTP_ERROR: (status: number) => `Request failed with status ${status}.`,

  // General Application Errors
  INTERNAL_SERVER_ERROR: 'Internal Server Error',
  UNAUTHORIZED: 'Unauthorized: Missing or invalid secret.',

  // Validation Errors
  VALIDATION_ERROR: 'Invalid request data.',
}

/**
 * A generic error logger for external API interactions.
 * @param service - The name of the service (e.g., 'Spotify', 'GoogleDocs').
 * @param message - The error message.
 * @param error - The original error object.
 */
export const logApiError = (
  service: string,
  message: string,
  error: unknown
) => {
  logger.error(`[${service} API Error]: ${message}`, error)
}
