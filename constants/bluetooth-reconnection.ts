/**
 * @file bluetooth-reconnection.ts
 * @description Centralized constants for Bluetooth reconnection logic.
 */
const envValue = Number(
  process.env.NEXT_PUBLIC_BLUETOOTH_MAX_RECONNECT_ATTEMPTS
)
export const BLUETOOTH_MAX_RECONNECT_ATTEMPTS = !isNaN(envValue) ? envValue : 2

// Reconnection Delay Parameters
export const RECONNECT_BASE_DELAY_MS = 5000
export const RECONNECT_RANDOM_DELAY_MS = 1000

// Fast Retry Parameters for initial connection attempts
export const FAST_RECONNECT_DELAY_MS = 1000
export const FAST_RECONNECT_MAX_ATTEMPTS = 3

// Timing Constants for GATT Stability
export const GATT_DISCONNECT_COOLDOWN_MS = 800
export const CONNECTION_STORM_THRESHOLD_MS = 5000
export const PERMISSIONS_REVOKED_TIMEOUT_MS = 2000

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
