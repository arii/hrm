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
export const MIN_MISSED_PACKET_THRESHOLD_MS = 2000

/**
 * Total time with no data (in ms) before forcing a reconnect.
 */
export const DATA_LIVENESS_TIMEOUT_MS = 30000

/**
 * How many packets to keep in the rolling average history.
 */
export const ROLLING_AVG_HISTORY_LENGTH = 5

/**
 * Signal quality tier thresholds (ms)
 */
export const EXCELLENT_SIGNAL_THRESHOLD_MS = 1200
export const GOOD_SIGNAL_THRESHOLD_MS = 2200

/**
 * UI Constants for Signal Indicator
 */
export const SIGNAL_PULSE_DURATION_S = 1.5
export const SIGNAL_LABEL_MIN_WIDTH_PX = 45
