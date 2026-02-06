/**
 * @fileoverview
 * This file contains constants related to calorie calculation thresholds, providing a
 * centralized configuration for validation and preventing unrealistic values.
 */

/**
 * The maximum number of calories that can be burned in a single workout session.
 * This is a safeguard against potential bugs or unrealistic sensor data.
 * @type {number}
 * @default 10000
 */
export const MAX_CALORIES_PER_WORKOUT = 10000

/**
 * The time gap threshold in seconds for processing heart rate data. Gaps larger
 * than this will be ignored to prevent inaccurate calorie calculations.
 * @type {number}
 * @default 10
 */
export const TIME_GAP_THRESHOLD_SECONDS = 10

/**
 * The minimum heart rate required for calorie calculation. Readings below this
 * are considered noise or invalid and will not be used for calorie estimation.
 * @type {number}
 * @default 30
 */
export const MIN_HR_FOR_CALORIE_CALCULATION = 30
