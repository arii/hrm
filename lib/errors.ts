/**
 * Error thrown when a silent connection is attempted but no saved device ID is found.
 */
export class NoSavedDeviceError extends Error {
  constructor() {
    super('No saved device ID for silent connection')
    this.name = 'NoSavedDeviceError'
  }
}
