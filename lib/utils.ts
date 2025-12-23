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
