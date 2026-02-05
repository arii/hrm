/**
 * @file constants/hrm.ts
 * @description This file contains all the constants related to heart rate monitor data and liveness.
 */

/**
 * Threshold in milliseconds after which a heart rate monitor is considered stale.
 * A warning state (reduced opacity) is triggered at this point.
 */
export const HRM_STALE_WARNING_MS = 20000

/**
 * Threshold in milliseconds after which a heart rate monitor is considered expired.
 * The tile is removed from the dashboard at this point.
 */
export const HRM_STALE_THRESHOLD_MS = 35000

/**
 * Frequency in milliseconds at which the heart rate liveness state is re-evaluated.
 */
export const HRM_LIVENESS_POLL_INTERVAL_MS = 5000
