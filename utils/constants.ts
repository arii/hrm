// File: utils/constants.ts
// Centralized constants for the application.

// Battery level thresholds for UI icons
export const BATTERY_LEVEL_FULL = 70
export const BATTERY_LEVEL_HIGH = 40
export const BATTERY_LEVEL_LOW = 20

// UI Text
export const CONNECT_HR_MONITOR_TITLE = 'Connect Your Heart Rate Monitor'
export const UNSUPPORTED_BLUETOOTH_TOOLTIP =
  'This browser does not support Web Bluetooth. Please use Chrome, Edge, or Opera.'
export const BLUETOOTH_NOT_SUPPORTED_TEXT = 'Bluetooth Not Supported'
export const CONNECT_HR_MONITOR_BUTTON_TEXT = 'Connect HR Monitor'
export const DISCONNECT_HR_MONITOR_BUTTON_TEXT = 'Disconnect HR Monitor'

// --- Heart Rate Calculation Constants ---

// --- Heart Rate Zones Configuration ---
export interface HeartRateZoneConfig {
  name: string
  minPercent: number // 0-100
  maxPercent: number // 0-100
  color: string
}

export const HEART_RATE_ZONES: HeartRateZoneConfig[] = [
  { name: 'Zone 5', minPercent: 90, maxPercent: 100, color: '#F44336' },
  { name: 'Zone 4', minPercent: 80, maxPercent: 90, color: '#FFEB3B' },
  { name: 'Zone 3', minPercent: 70, maxPercent: 80, color: '#4CAF50' },
  { name: 'Zone 2', minPercent: 60, maxPercent: 70, color: '#2196F3' },
  { name: 'Zone 1', minPercent: 50, maxPercent: 60, color: '#9E9E9E' },
]

// --- Calorie Calculation Constants ---
// Based on standard metabolic formulas (e.g., Keytel)
export const CALORIE_DEFAULTS = {
  WEIGHT_KG: 75, // Default weight if not provided
  // Simplified Factors (Male/Female average or specific)
  // Formula: Calories/min = (-55.0969 + 0.6309 x HR + 0.1988 x Weight + 0.2017 x Age) / 4.184
  FACTOR_HR: 0.6309,
  FACTOR_WEIGHT: 0.1988,
  FACTOR_AGE: 0.2017,
  INTERCEPT: 55.0969,
  JOULE_CONVERSION: 4.184,
}

// The maximum plausible jump in calories between two consecutive HRM updates.
// Used as a server-side sanity check to reject anomalous client values.
export const MAX_CALORIE_JUMP_PER_UPDATE = 50

// The maximum plausible initial calorie value for a new workout session.
// Used as a server-side sanity check to reject anomalous initial client values.
export const MAX_INITIAL_CALORIES = 1000
// Server Constants
export const DEFAULT_PORT = 3000
export const DEFAULT_HOST_PRODUCTION = '0.0.0.0'
export const DEFAULT_HOST_DEVELOPMENT = '127.0.0.1'
export const CACHE_MAX_AGE = '365d'

// Tabata Timer Constants
export const DEFAULT_WORK_DURATION = 20 // seconds
export const DEFAULT_REST_DURATION = 10 // seconds
export const START_COUNTDOWN_DURATION = 5 // seconds
export const TIMER_INTERVAL = 1000 // ms

// --- Stale Tile Display ---
// Visual indicator threshold (show "waiting for data" state before removal)
export const STALE_TILE_DISPLAY_THRESHOLD_MS = 20000 // 20 seconds
// Tile removal threshold
export const STALE_TILE_REMOVAL_THRESHOLD_MS = 35000 // 35 seconds
