/**
 * @file bluetooth-config.ts
 * @description Centralized constants for Bluetooth HRM configuration.
 */

export const HR_SERVICE_UUID = 'heart_rate'
export const HR_CHARACTERISTIC_UUID = 'heart_rate_measurement'
export const BATTERY_SERVICE_UUID = 'battery_service'
export const BATTERY_LEVEL_CHARACTERISTIC_UUID = 'battery_level'

export const ROLLING_AVG_HISTORY_LENGTH = 5
export const MISSED_PACKET_THRESHOLD_BUFFER_MS = 500
export const MIN_MISSED_PACKET_THRESHOLD_MS = 1500

export const HEARTBEAT_INTERVAL_MS_TEST = 500
export const HEARTBEAT_INTERVAL_MS_PROD = 1000

export const HEARTBEAT_INTERVAL_MS =
  typeof process !== 'undefined' && process.env.NODE_ENV === 'test'
    ? HEARTBEAT_INTERVAL_MS_TEST
    : HEARTBEAT_INTERVAL_MS_PROD

// Connection timeout in milliseconds
export const CONNECTION_TIMEOUT_MS = 30000
