/**
 * Creates an object from an array of key-value pairs, filtering out entries
 * where the value is null or undefined. This is useful for cleaning up
 * objects before updating state.
 * @param entries An array of [key, value] pairs.
 * @returns A new object with the null/undefined values removed.
 */
export const objectFromEntries = <T>(
  entries: [string, T | null | undefined][]
): Record<string, T> => {
  return Object.fromEntries(
    entries.filter(([, value]) => value !== null && value !== undefined)
  ) as Record<string, T>
}

/**
 * Rounds a number to a specified number of decimal places.
 * @param value The number to round.
 * @param decimalPlaces The number of decimal places to round to.
 * @returns The rounded number.
 */
export const roundTo = (value: number, decimalPlaces: number): number => {
  const factor = Math.pow(10, decimalPlaces)
  return Math.round((value + Number.EPSILON) * factor) / factor
}

/**
 * Formats a duration in seconds into a HH:MM:SS string.
 * @param seconds The duration in seconds.
 * @returns A string in HH:MM:SS format.
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
