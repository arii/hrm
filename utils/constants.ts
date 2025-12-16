// File: utils/constants.ts
// Centralized constants for the application.

const MAX_HR_DEFAULT = 185

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
const MAX_HR_ESTIMATION_BASE = 220 // Fox formula constant

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
