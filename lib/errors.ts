/**
 * @fileoverview Defines custom error classes for standardized error handling across the application.
 */

/**
 * Base class for all application-specific errors.
 * This allows for easy identification of custom errors.
 */
export class AppError extends Error {
  constructor(message: string) {
    super(message)
    this.name = this.constructor.name
  }
}

/**
 * Represents an error that occurs during an external API request.
 * Contains the HTTP status code for more specific error handling.
 */
export class ApiError extends AppError {
  public readonly statusCode: number

  constructor(message: string, statusCode: number) {
    super(message)
    // Ensure the status code is a valid HTTP status code.
    this.statusCode = statusCode >= 200 && statusCode <= 599 ? statusCode : 500
  }
}

/**
 * A specific type of ApiError for Spotify API interactions.
 * This allows for targeted error handling for Spotify-related issues.
 */
export class SpotifyApiError extends ApiError {
  constructor(message: string, statusCode: number) {
    super(message, statusCode)
  }
}

/**
 * Represents a network-level error, such as a connection failure.
 */
export class NetworkError extends AppError {
  constructor(message = 'A network error occurred. Please try again.') {
    super(message)
  }
}

/**
 * Represents a validation error, typically from parsing incoming data.
 */
export class ValidationError extends AppError {
  constructor(message: string) {
    super(message)
  }
}
