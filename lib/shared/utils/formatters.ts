/**
 * @fileoverview Shared utility functions for formatting data.
 */

/**
 * Formats a duration in seconds into a HH:MM:SS string.
 * If the input is not a valid number or is negative, it returns "00:00:00".
 *
 * @param {number} seconds - The duration in seconds to format.
 * @returns {string} The formatted duration string (e.g., "01:23:45").
 * @example
 * // Returns "00:01:30"
 * formatDuration(90);
 *
 * // Returns "01:00:00"
 * formatDuration(3600);
 *
 * // Returns "00:00:00"
 * formatDuration(-10);
 *
 * // Returns "00:00:00"
 * formatDuration(NaN);
 */
export const formatDuration = (seconds: number): string => {
  if (isNaN(seconds) || seconds < 0) {
    return '00:00:00'
  }
  const h = Math.floor(seconds / 3600)
    .toString()
    .padStart(2, '0')
  const m = Math.floor((seconds % 3600) / 60)
    .toString()
    .padStart(2, '0')
  const s = Math.floor(seconds % 60)
    .toString()
    .padStart(2, '0')
  return `${h}:${m}:${s}`
}
