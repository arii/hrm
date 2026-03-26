/**
 * @file bluetooth-reconnection.ts
 * @description Centralized constants for Bluetooth reconnection logic.
 */

// Maximum number of times to attempt reconnection before giving up.
export const BLUETOOTH_MAX_RECONNECT_ATTEMPTS =
  typeof process !== 'undefined' &&
  process.env.NEXT_PUBLIC_BLUETOOTH_MAX_RECONNECT_ATTEMPTS
    ? parseInt(process.env.NEXT_PUBLIC_BLUETOOTH_MAX_RECONNECT_ATTEMPTS, 10)
    : 8

// Reconnection Delay Parameters
export const RECONNECT_BASE_DELAY_MS = 2000
export const RECONNECT_DELAY_INCREMENT_MS = 500
export const RECONNECT_RANDOM_DELAY_MS = 1000

// Fast Retry Parameters for initial connection attempts
export const FAST_RECONNECT_DELAY_MS = 1000
export const FAST_RECONNECT_MAX_ATTEMPTS = 3

export const HEARTBEAT_INTERVAL_MS = 1000

/**
 * @param attempt - The current attempt number (starting from 1).
 * @returns The delay in milliseconds using a linear backoff strategy with jitter.
 */
export const getBackoffDelay = (attempt: number): number => {
  const increment = (attempt - 1) * RECONNECT_DELAY_INCREMENT_MS
  const jitter = Math.random() * RECONNECT_RANDOM_DELAY_MS
  return RECONNECT_BASE_DELAY_MS + increment + jitter
}
