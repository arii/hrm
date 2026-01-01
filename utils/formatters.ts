// File: utils/formatters.ts

/**
 * Formats a number to a specified number of decimal places, handling null/undefined values.
 * For future internationalization, this function can be expanded to use `Intl.NumberFormat`.
 *
 * @param value - The number to format.
 * @param decimalPlaces - The number of decimal places to display.
 * @returns The formatted number as a string, or '0.00' if the value is null or undefined.
 */
export const formatNumber = (
  value: number | null | undefined,
  decimalPlaces = 2
): string => {
  if (value === null || typeof value === 'undefined') {
    // Return a default formatted string for null/undefined values
    // to prevent crashes and provide a clear UI default.
    return (0).toFixed(decimalPlaces)
  }
  return value.toFixed(decimalPlaces)
}

/**
 * Formats a duration in milliseconds into a MM:SS string.
 * @param milliseconds - The duration in milliseconds.
 * @returns The formatted duration string.
 */
export const formatDuration = (milliseconds: number): string => {
  const totalSeconds = Math.floor(milliseconds / 1000)
  const minutes = Math.floor(totalSeconds / 60)
  const seconds = totalSeconds % 60
  return `${minutes}:${seconds.toString().padStart(2, '0')}`
}
