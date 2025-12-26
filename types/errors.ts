// File: types/errors.ts
/**
 * Description: Defines custom error classes for the application.
 */

export class ServiceInitializationError extends Error {
  constructor(serviceName: string, originalError?: unknown) {
    super(`Failed to initialize ${serviceName}`);
    this.name = 'ServiceInitializationError';
    this.cause = originalError;
  }
}

export class ConfigurationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ConfigurationError';
  }
}
