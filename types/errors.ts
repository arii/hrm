// File: types/errors.ts
/**
 * Defines domain-specific error classes for the application.
 * This allows for more precise error handling and debugging.
 */

/**
 * Thrown when a critical service fails to initialize.
 */
export class ServiceInitializationError extends Error {
  constructor(serviceName: string, originalError?: unknown) {
    super(`Failed to initialize ${serviceName}`);
    this.name = 'ServiceInitializationError';
    this.cause = originalError;
  }
}

/**
 * Thrown when a configuration or input value is invalid.
 */
export class ValidationError extends Error {
  constructor(message: string, originalError?: unknown) {
    super(message);
    this.name = 'ValidationError';
    this.cause = originalError;
  }
}
