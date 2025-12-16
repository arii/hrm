// lib/errors.ts

/**
 * Custom error class for general HTTP API-related errors.
 * Provides a standardized way to include an HTTP status code.
 */
export class HttpError extends Error {
  status: number

  constructor(message: string, status: number) {
    super(message)
    this.name = 'HttpError'
    this.status = status
  }
}

/**
 * Custom error class specifically for Spotify API errors.
 * Extends HttpError for consistent handling while providing specific context.
 */
export class SpotifyApiError extends HttpError {
  constructor(message: string, status: number) {
    super(message, status)
    this.name = 'SpotifyApiError'
  }
}
