// File: utils/constants.ts
// Centralized constants for the application.
import { HEART_RATE_ZONES, HeartRateZoneConfig } from '@/lib/shared/hr-zones'

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
// Exported from lib/shared/hr-zones.ts for canonical source of truth.
export { HEART_RATE_ZONES }
export type { HeartRateZoneConfig }

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

export const MAX_CALORIE_JUMP_PER_UPDATE = 50
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

// --- Heart Rate Monitoring (HRM) Constants ---
export const HRM_STALE_THRESHOLD_MS = 30000 // 30 seconds
export const HRM_WARNING_THRESHOLD_MS = 10000 // 10 seconds
