/**
 * Error thrown when a silent connection is attempted but no saved device ID is found.
 */
export class NoSavedDeviceError extends Error {
  constructor() {
    super('No saved device ID for silent connection')
    this.name = 'NoSavedDeviceError'
  }
}

/**
 * Custom error class for API errors.
 */
export class ApiError extends Error {
  statusCode: number

  constructor(statusCode: number, message: string) {
    super(message)
    this.name = 'ApiError'
    this.statusCode = statusCode
  }
}

/**
 * Error thrown when a service fails to initialize.
 */
export class ServiceInitializationError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'ServiceInitializationError'
  }
}
