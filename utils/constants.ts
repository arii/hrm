// File: utils/constants.ts
// Centralized constants for the application.

export const MAX_HR_DEFAULT = 185

// --- Heart Rate Calculation Constants ---
export const MAX_HR_ESTIMATION_BASE = 220 // Fox formula constant

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

// Tabata Timer Constants
export const DEFAULT_WORK_DURATION = 20 // seconds
export const DEFAULT_REST_DURATION = 10 // seconds
export const START_COUNTDOWN_DURATION = 5 // seconds
export const TIMER_INTERVAL = 1000 // ms
