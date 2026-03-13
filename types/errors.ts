// File: types/errors.ts
/**
 * Description: Defines custom error classes for the application.
 */

/**
 * Error thrown when a configuration is invalid.
 */
export class ConfigurationError extends Error {
  /**
   * @param {string} message - The error message.
   */
  constructor(message: string) {
    super(message)
    this.name = 'ConfigurationError'
  }
}

export class NoSavedDeviceError extends Error {
  constructor() {
    super('NO_SAVED_DEVICE')
    this.name = 'NoSavedDeviceError'
  }
}
