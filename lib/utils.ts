/**
 * @fileoverview Shared utility functions.
 */

/**
 * Formats a duration in seconds into a HH:MM:SS string.
 * @param seconds The duration in seconds.
 * @returns The formatted duration string.
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

/**
 * Rounds a number to a specified number of decimal places.
 * Includes a small epsilon to handle floating-point inaccuracies.
 * @param num The number to round.
 * @param decimals The number of decimal places to round to.
 * @returns The rounded number.
 */
export const roundTo = (num: number, decimals: number): number => {
  const factor = Math.pow(10, decimals)
  return Math.round((num + Number.EPSILON) * factor) / factor
}
