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
  process.env.NEXT_PUBLIC_BLUETOOTH_MAX_RECONNECT_ATTEMPTS
    ? parseInt(process.env.NEXT_PUBLIC_BLUETOOTH_MAX_RECONNECT_ATTEMPTS, 10)
    : 8

// Reconnection Delay Parameters
export const RECONNECT_BASE_DELAY_MS = 2000
