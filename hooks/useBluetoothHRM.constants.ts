/**
 * @file hooks/useBluetoothHRM.constants.ts
 * @description This file contains constants used in the useBluetoothHRM hook.
 * It centralizes configuration values for Bluetooth Low Energy (BLE) Heart Rate Monitor (HRM) interactions.
 */

// Bluetooth Service and Characteristic UUIDs
export const HR_SERVICE_UUID = 'heart_rate'
export const HR_CHARACTERISTIC_UUID = 'heart_rate_measurement'
export const BATTERY_SERVICE_UUID = 'battery_service'
export const BATTERY_LEVEL_CHARACTERISTIC_UUID = 'battery_level'

// Signal Quality Calculation
export const ROLLING_AVG_HISTORY_LENGTH = 5
export const MISSED_PACKET_THRESHOLD_BUFFER_MS = 500
export const MIN_MISSED_PACKET_THRESHOLD_MS = 1500
export const HEARTBEAT_INTERVAL_MS = 1000

// Data Liveness and Reconnection
export const DEFAULT_DATA_LIVENESS_TIMEOUT_MS = 10000
export const MAX_RECONNECT_ATTEMPTS = 5
export const RECONNECT_DELAY_BASE_MS = 1000
export const RECONNECT_DELAY_BACKOFF_FACTOR_MS = 500
export const RECONNECT_DELAY_RANDOMIZATION_MS = 1000
export const FAILED_RECONNECT_RESET_DELAY_MS = 2000

// GATT Connection
export const GATT_CONNECTION_TIMEOUT_MS = 30000
export const GATT_CONNECTION_MAX_RETRIES = 3
