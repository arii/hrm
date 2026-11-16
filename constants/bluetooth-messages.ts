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
  waitingForDevice: (deviceName: string) =>
    `Waiting for ${deviceName || 'device'} to wake up...`,
  stillWaitingForDevice: (deviceName: string) =>
    `Still waiting for ${deviceName || 'device'}. Tap Connect to re-select it.`,
  deviceHeldElsewhere: (deviceName: string) =>
    `${deviceName || 'Device'} is nearby but won't connect. It may be used by another app.`,
  reconnectingAttempt: (reason: string) => `${reason}. Reconnecting...`,
  checkingSavedDevices: 'Checking saved devices...',
  lookingForDevice: (deviceName: string) =>
    `Looking for ${deviceName || 'device'} nearby...`,
  scanningForDevices: 'Scanning for devices...',
  autoConnectFailed:
    'Auto-connect failed. Use Connect button to select device.',
  connectingToSavedDevice: 'Connecting to saved device...',
  deviceBusy: (delay: number) => `Device busy. Retrying in ${delay / 1000}s...`,
  quietStrapRetry: 'Strap is quiet. Retrying...',

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
  unknownError: 'An unknown error occurred.',
}
