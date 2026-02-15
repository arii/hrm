/**
 * @file bluetooth-reconnection.ts
 * @description Centralized constants for Bluetooth reconnection logic.
 */
import { env } from '@/lib/env'

// Maximum number of times to attempt reconnection before giving up.
export const BLUETOOTH_MAX_RECONNECT_ATTEMPTS =
  env.BLUETOOTH_MAX_RECONNECTION_ATTEMPTS ?? 5

// Reconnection Delay Parameters
export const RECONNECT_BASE_DELAY_MS = 1000
export const RECONNECT_DELAY_INCREMENT_MS = 500
export const RECONNECT_RANDOM_DELAY_MS = 1000
