/**
 * @fileoverview Custom error classes for the application.
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
 * Represents an error from an external API.
 */
export class ApiError extends AppError {
  public readonly statusCode: number

  constructor(statusCode: number, message: string) {
    super(`API Error ${statusCode}: ${message}`)
    this.statusCode = statusCode
  }
}

/**
 * Represents a validation error (e.g., invalid input).
 */
export class ValidationError extends AppError {
  constructor(message: string) {
    super(`Validation Error: ${message}`)
  }
}

/**
 * Represents an error originating from an internal service.
 */
export class ServiceError extends AppError {
  constructor(serviceName: string, message: string) {
    super(`[${serviceName}] ${message}`)
  }
}
