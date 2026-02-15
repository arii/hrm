// File: utils/constants.ts
// Centralized constants for the application.

// --- Calorie Calculation Constants ---
// Based on standard metabolic formulas (e.g., Keytel)
export const MAX_CALORIE_JUMP_PER_UPDATE = 50
export const MAX_INITIAL_CALORIES = 1000

// Tabata Timer Constants
export const DEFAULT_WORK_DURATION = 20 // seconds
export const DEFAULT_REST_DURATION = 10 // seconds
export const START_COUNTDOWN_DURATION = 5 // seconds
export const TIMER_INTERVAL = 1000 // ms

// --- Heart Rate Monitoring (HRM) Constants ---
export const HRM_STALE_THRESHOLD_MS = 30000 // 30 seconds
export const HRM_WARNING_THRESHOLD_MS = 10000 // 10 seconds
