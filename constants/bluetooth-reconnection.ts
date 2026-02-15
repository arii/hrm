/**
 * @file bluetooth-reconnection.ts
 * @description Centralized constants for Bluetooth reconnection logic.
 */

// Maximum number of times to attempt reconnection before giving up.
// Note: We avoid importing @/lib/env here to prevent client-side crashes,
// as that module performs server-side environment validation.
// We use process.env directly which is handled by Next.js at build time.
export const BLUETOOTH_MAX_RECONNECT_ATTEMPTS =
  typeof process !== 'undefined' &&
  process.env.BLUETOOTH_MAX_RECONNECTION_ATTEMPTS
    ? parseInt(process.env.BLUETOOTH_MAX_RECONNECTION_ATTEMPTS, 10)
    : 5

// Reconnection Delay Parameters
export const RECONNECT_BASE_DELAY_MS = 1000
export const RECONNECT_DELAY_INCREMENT_MS = 500
export const RECONNECT_RANDOM_DELAY_MS = 1000
