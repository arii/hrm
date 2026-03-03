/**
 * Bluetooth and HRM signal quality constants.
 */

/**
 * Ideally, HRM packets arrive every 1000ms (1Hz).
 * Jitter +/- 20% is considered excellent.
 */
export const EXCELLENT_SIGNAL_THRESHOLD_MS = 1200

/**
 * Doubling the period suggests every other packet is being dropped.
 */
export const GOOD_SIGNAL_THRESHOLD_MS = 2200

/**
 * Threshold for triggering a 'Weak Signal' warning snackbar.
 * Usually triggered after multiple consecutive slow/dropped packets.
 */
export const SIGNAL_STRIKE_THRESHOLD = 3
