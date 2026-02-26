/**
 * Bluetooth Signal Quality Thresholds
 */

/**
 * Packets arriving later than this (in ms) indicate signal instability.
 * Standard BLE HR profile is typically 1000ms (1Hz).
 */
export const STABILITY_THRESHOLD_MS = 1500

/**
 * Packets arriving later than this (in ms) indicate a likely connection loss.
 */
export const CRITICAL_THRESHOLD_MS = 3000

/**
 * Time buffer added to the rolling average to determine when a packet is considered "missed" by the watchdog.
 */
export const MISSED_PACKET_THRESHOLD_BUFFER_MS = 500

/**
 * Minimum threshold for the watchdog to trigger a missed packet update.
 */
export const MIN_MISSED_PACKET_THRESHOLD_MS = 1500

/**
 * How many packets to keep in the rolling average history.
 */
export const ROLLING_AVG_HISTORY_LENGTH = 5
