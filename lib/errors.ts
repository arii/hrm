// lib/errors.ts

/**
 * Custom error class for API-related errors.
 *
 * This class allows us to standardize error handling by including an HTTP status code
 * with our errors. The error handling middleware can then use this status code to
 * send the appropriate HTTP response.
 */
export class ApiError extends Error {
  statusCode: number

  /**
   * Creates an instance of ApiError.
   *
   * @param statusCode The HTTP status code for the error.
   * @param message The error message.
   */
  constructor(statusCode: number, message: string) {
    super(message)
    this.name = 'ApiError'
    this.statusCode = statusCode
  }
}

export class ServiceInitializationError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'ServiceInitializationError'
  }
}

/**
 * Error thrown when a silent connection is attempted but no saved device ID is found.
 */
export class NoSavedDeviceError extends Error {
  constructor() {
    super('No saved device ID for silent connection')
    this.name = 'NoSavedDeviceError'
  }
}
