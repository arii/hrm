/**
 * @file bluetooth-config.ts
 * @description Centralized constants for Bluetooth UUIDs and core timing configuration.
 */

export const HR_SERVICE_UUID = 'heart_rate'
export const HR_CHARACTERISTIC_UUID = 'heart_rate_measurement'
export const BATTERY_SERVICE_UUID = 'battery_service'
export const BATTERY_LEVEL_CHARACTERISTIC_UUID = 'battery_level'

// Heartbeat interval logic moved from useBluetoothHRM.ts
const HEARTBEAT_INTERVAL_MS_test = 500
const HEARTBEAT_INTERVAL_MS_prod = 1000

export const HEARTBEAT_INTERVAL_MS =
  typeof process !== 'undefined' && process.env.NODE_ENV === 'test'
    ? HEARTBEAT_INTERVAL_MS_test
    : HEARTBEAT_INTERVAL_MS_prod
