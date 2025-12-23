/**
 * @file This file contains utility functions for handling time durations.
 * @module lib/shared/utils/time
 */

/**
 * Formats a duration in seconds into a HH:MM:SS string.
 *
 * @param {number} seconds - The duration in seconds.
 * @returns {string} The formatted duration string (e.g., "01:23:45"). Returns "00:00:00" for invalid inputs.
 * @example
 * formatDuration(3661) // "01:01:01"
 * formatDuration(90)   // "00:01:30"
 * formatDuration(-10)  // "00:00:00"
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
