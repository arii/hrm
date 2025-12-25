// File: constants/index.ts

/**
 * @file This file contains shared constant values used across the application.
 */

/**
 * The default name assigned to a user if not otherwise specified.
 * @type {string}
 */
export const DEFAULT_USER_NAME = 'Default User'

/**
 * The default age used for calculations if the user's age is not provided.
 * @type {number}
 */
export const DEFAULT_USER_AGE = 30

/**
 * The default weight in kilograms, used for calorie calculations when no other
 * weight is available. Approximately 154 lbs.
 * @type {number}
 */
export const DEFAULT_USER_WEIGHT_KG = 70

/**
 * The default weight in pounds, equivalent to `DEFAULT_USER_WEIGHT_KG`.
 * Used as a default placeholder in the UI when the imperial system is selected.
 * @type {number}
 */
export const DEFAULT_USER_WEIGHT_LBS = 154
