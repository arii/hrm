// File: lib/errors.ts
/**
 * Defines custom error types for the application.
 */

/**
 * Base class for custom application errors.
 */
export class AppError extends Error {
  constructor(message: string) {
    super(message)
    this.name = this.constructor.name
  }
}

/**
 * Represents an error originating from the Spotify API.
 */
export class SpotifyApiError extends AppError {
  public statusCode: number

  constructor(message: string, statusCode = 500) {
    super(message)
    this.statusCode = statusCode
  }
}

/**
 * Represents an error when a resource is not found.
 */
export class NotFoundError extends AppError {
  constructor(message = 'Resource not found') {
    super(message)
  }
}
