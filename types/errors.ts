// File: types/errors.ts
/**
 * Description: Defines custom error classes for the application.
 */

/**
 * Error thrown when a service fails to initialize correctly.
 */
export class ServiceInitializationError extends Error {
  /**
   * @param {string} serviceName - The name of the service that failed.
   * @param {unknown} [originalError] - The original error that caused the failure.
   */
  constructor(serviceName: string, originalError?: unknown) {
    super(`Failed to initialize ${serviceName}`);
    this.name = 'ServiceInitializationError';
    this.cause = originalError;
  }
}

/**
 * Error thrown when a configuration is invalid.
 */
export class ConfigurationError extends Error {
  /**
   * @param {string} message - The error message.
   */
  constructor(message: string) {
    super(message);
    this.name = 'ConfigurationError';
  }
}
