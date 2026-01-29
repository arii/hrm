/**
 * @fileoverview Shared utility functions.
 */

/**
 * Formats a duration into a string.
 * @param duration The duration.
 * @param options The options for formatting.
 * @returns The formatted duration string.
 */
export const formatDuration = (
  duration: number,
  options: {
    unit: 'seconds' | 'milliseconds'
    format?: 'HH:MM:SS' | 'MM:SS'
  }
): string => {
  const { unit, format = 'HH:MM:SS' } = options

  if (isNaN(duration) || duration < 0) {
    if (format === 'HH:MM:SS') {
      return '00:00:00'
    }
    return '00:00'
  }

  const totalSeconds =
    unit === 'milliseconds' ? Math.floor(duration / 1000) : duration

  if (format === 'MM:SS') {
    const minutes = Math.floor(totalSeconds / 60)
    const seconds = Math.floor(totalSeconds % 60)
      .toString()
      .padStart(2, '0')
    return `${minutes}:${seconds}`
  }

  const h = Math.floor(totalSeconds / 3600)
    .toString()
    .padStart(2, '0')
  const m = Math.floor((totalSeconds % 3600) / 60)
    .toString()
    .padStart(2, '0')
  const s = Math.floor(totalSeconds % 60)
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
