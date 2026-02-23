/**
 * @file bluetooth-reconnection.ts
 * @description Centralized constants for Bluetooth reconnection logic.
 */

// Maximum number of times to attempt reconnection before giving up.
export const BLUETOOTH_MAX_RECONNECT_ATTEMPTS =
  typeof process !== 'undefined' &&
  process.env.NEXT_PUBLIC_BLUETOOTH_MAX_RECONNECT_ATTEMPTS
    ? parseInt(process.env.NEXT_PUBLIC_BLUETOOTH_MAX_RECONNECT_ATTEMPTS, 10)
    : 2

// Reconnection Delay Parameters
export const RECONNECT_BASE_DELAY_MS = 5000
export const RECONNECT_DELAY_INCREMENT_MS = 1000
export const RECONNECT_RANDOM_DELAY_MS = 1000

// Fast Retry Parameters for initial connection attempts
export const FAST_RECONNECT_DELAY_MS = 1000
export const FAST_RECONNECT_MAX_ATTEMPTS = 3

/**
 * @param attempt - The current attempt number (starting from 1).
 * @param isZombieError - Whether the error is a "Zombie" error (NetworkError/Device Busy).
 * @returns The delay in milliseconds using an exponential backoff strategy with jitter.
 */
export const getBackoffDelay = (
  attempt: number,
  isZombieError = false
): number => {
  // Exponential backoff: base * 2^(attempt-1)
  let delay = RECONNECT_BASE_DELAY_MS * Math.pow(2, attempt - 1)
  const jitter = Math.random() * RECONNECT_RANDOM_DELAY_MS

  if (isZombieError) {
    delay *= 2 // Double the wait time for "Zombie" errors to allow OS cleanup
  }

  return delay + jitter
}
