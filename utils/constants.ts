// File: utils/constants.ts
// Centralized constants for the application.

import { MAX_HR_DEFAULT } from '../constants/index'

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

// WebSocket Management
export const WEBSOCKET_WATCHDOG_INTERVAL_MS = 30000 // 30 seconds
export const WEBSOCKET_GRACE_PERIOD_MS = 5000 // 5 seconds
