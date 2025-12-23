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

/**
 * Custom error class for validation errors.
 *
 * This error should be thrown when user input or other data fails validation checks.
 */
export class ValidationError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'ValidationError'
  }
}

/**
 * Custom error class for service-level errors.
 *
 * This error should be thrown when an error occurs within a service,
 * such as when a service is not properly initialized or configured.
 */
export class ServiceError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'ServiceError'
  }
}
