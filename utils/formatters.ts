// File: utils/formatters.ts

/**
 * Formats a duration given in seconds into a string of the format "MM:SS".
 *
 * @param {number} totalSeconds - The total duration in seconds.
 * @returns {string} The formatted duration string.
 */
export const formatDuration = (totalSeconds: number): string => {
  if (isNaN(totalSeconds) || totalSeconds < 0) {
    return '00:00'
  }

  const minutes = Math.floor(totalSeconds / 60)
  const seconds = Math.floor(totalSeconds % 60)

  const formattedMinutes = String(minutes).padStart(2, '0')
  const formattedSeconds = String(seconds).padStart(2, '0')

  return `${formattedMinutes}:${formattedSeconds}`
}
