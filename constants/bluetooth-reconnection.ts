/**
 * @file bluetooth-reconnection.ts
 * @description Centralized constants and messages for Bluetooth logic.
 */
import { env } from '@/lib/env'

export const BLUETOOTH_MAX_RECONNECT_ATTEMPTS =
  env.NEXT_PUBLIC_BLUETOOTH_MAX_RECONNECT_ATTEMPTS

// Reconnection Delay Parameters
export const RECONNECT_BASE_DELAY_MS = 5000
export const RECONNECT_RANDOM_DELAY_MS = 1000

// Fast Retry Parameters for initial connection attempts
export const FAST_RECONNECT_DELAY_MS = 1000
export const FAST_RECONNECT_MAX_ATTEMPTS = 3

// Timing Constants for GATT Stability
export const GATT_DISCONNECT_COOLDOWN_MS = 800
export const PERMISSIONS_REVOKED_TIMEOUT_MS = 2000

// Connection Storm Parameters
export const CONNECTION_STORM_WINDOW_MS = 10000
export const CONNECTION_STORM_COUNT = 3

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
    `Failed to reconnect after ${maxAttempts} attempts. Please re-sync your sensor.`,
  reconnectingAttempt: (reason: string, attempt: number, maxAttempts: number) =>
    `${reason}. Reconnecting... (Attempt ${attempt}/${maxAttempts})`,
  checkingSavedDevices: 'Checking saved devices...',
  scanningForDevices: 'Scanning for devices...',
  autoConnectFailed:
    'Auto-connect failed. Use Connect button to select device.',
  connectingToSavedDevice: 'Connecting to saved device...',
  deviceBusy: (delay: number, attempt: number, maxRetries: number) =>
    `Device busy. Retrying in ${delay / 1000}s... (${attempt}/${maxRetries})`,
  connectionStormDetected:
    'Connection unstable. Please re-sync your sensor manually.',
  backgroundReconnectDisabled:
    'Reconnection paused while tab is in background.',

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

/**
 * @param attempt - The current attempt number (starting from 1).
 * @param isZombieError - Whether the error is a "Zombie" error (NetworkError/Device Busy).
 * @returns The delay in milliseconds using an exponential backoff strategy with jitter.
 */
export const getBackoffDelay = (
  attempt: number,
  isZombieError = false
): number => {
  let delay = RECONNECT_BASE_DELAY_MS * Math.pow(2, attempt - 1)
  const jitter = Math.random() * RECONNECT_RANDOM_DELAY_MS

  if (isZombieError) {
    delay *= 2 // Double the wait time for "Zombie" errors to allow OS cleanup
  }

  return delay + jitter
}
