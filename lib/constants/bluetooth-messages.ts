/**
 * @file bluetooth-messages.ts
 * @description This file contains all the Bluetooth status messages used in the application.
 * Using a centralized file for these messages improves maintainability and prepares
 * the application for internationalization (i18n) by providing a single source of
 * truth for all user-facing Bluetooth-related text.
 */
export const BLUETOOTH_MESSAGES = {
  // Connection Statuses
  disconnected: 'Disconnected',
  connecting: 'Connecting...',
  connected: 'Connected',
  reconnecting: 'Reconnecting...',

  // Custom Status Messages
  unstableConnection: 'Connection unstable. Reconnecting...',
  devicePermissionsRevoked:
    'Device permissions revoked. Ready for new connection.',
  connectingToDevice: (deviceName: string) =>
    `Connecting to: ${deviceName || 'Device'}...`,
  connectedToDevice: (deviceName: string) => `Connected to: ${deviceName}`,
  failedToReconnect: (maxAttempts: number) =>
    `Failed to reconnect after ${maxAttempts} attempts. Resetting device...`,
  reconnectingAttempt: (reason: string, attempt: number, maxAttempts: number) =>
    `${reason}. Reconnecting... (Attempt ${attempt}/${maxAttempts})`,
  checkingSavedDevices: 'Checking saved devices...',
  scanningForDevices: 'Scanning for devices...',
  autoConnectFailed:
    'Auto-connect failed. Use Connect button to select device.',
  connectingToSavedDevice: 'Connecting to saved device...',
  deviceBusy: (delay: number, attempt: number, maxRetries: number) =>
    `Device busy (Zombie). Retrying in ${
      delay / 1000
    }s... (${attempt}/${maxRetries})`,

  // Error Messages
  error: 'Error',
  errorWithDetails: (message: string) => `Failed: ${message}`,
  errorClearingPermissions: 'Error clearing device permissions.',
  connectionCancelled: 'Connection cancelled. No device selected.',
  securityError: 'Security error. Use HTTPS or localhost.',
  connectionFailed:
    'Connection failed. Device might be too far or low battery.',
  bluetoothError: (errorName: string) => `Bluetooth error: ${errorName}`,
  connectionTimeout: 'Connection timed out. Wake up device and try again.',
  connectionTimeoutReset: 'Connection timeout. Resetting device...',
  unknownError: 'An unknown error occurred.',
}
