// File: utils/constants.ts
// Centralized constants for the application.

export const MAX_HR_DEFAULT = 185

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
export const MAX_HR_ESTIMATION_BASE = 220 // Fox formula constant

/**
 * Calculates Max Heart Rate based on age using the standard Fox formula.
 * Falls back to MAX_HR_DEFAULT if age is invalid or not provided.
 */
export const calculateMaxHr = (age?: number | string | null): number => {
  if (!age) return MAX_HR_DEFAULT

  const ageNum = typeof age === 'string' ? parseInt(age, 10) : age

  if (isNaN(ageNum) || ageNum <= 0) {
    return MAX_HR_DEFAULT
  }

  return MAX_HR_ESTIMATION_BASE - ageNum
}

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
  AGE: 30, // Default age if not provided
}

// Keytel et al. (2005) formula constants for calorie calculation
export const KEYTEL_CONSTANTS = {
  MALE: {
    INTERCEPT: -55.0969,
    HR_FACTOR: 0.6309,
    WEIGHT_FACTOR: 0.1988,
    AGE_FACTOR: 0.2017,
  },
  FEMALE: {
    INTERCEPT: -20.4022,
    HR_FACTOR: 0.4472,
    WEIGHT_FACTOR: -0.1263,
    AGE_FACTOR: 0.074,
  },
  AVERAGE: {
    INTERCEPT: (-55.0969 + -20.4022) / 2,
    HR_FACTOR: (0.6309 + 0.4472) / 2,
    WEIGHT_FACTOR: (0.1988 + -0.1263) / 2,
    AGE_FACTOR: (0.2017 + 0.074) / 2,
  },
  JOULE_TO_KCAL_CONVERSION: 4.184,
}
