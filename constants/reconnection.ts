/**
 * @file constants/reconnection.ts
 * @description This file contains all the constants related to device reconnection logic.
 */

// Maximum number of times to attempt reconnection before giving up.
export const MAX_RECONNECT_ATTEMPTS = 5

// Base delay in milliseconds for the first reconnection attempt.
export const RECONNECT_BASE_DELAY_MS = 1000

// The amount of time in milliseconds to add to the delay for each subsequent attempt.
export const RECONNECT_DELAY_INCREMENT_MS = 500

// The maximum amount of random delay to add to the reconnection attempt delay.
export const RECONNECT_RANDOM_DELAY_MS = 1000
