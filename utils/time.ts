/**
 * Formats a duration in milliseconds into a mm:ss format.
 * @param ms - The duration in milliseconds.
 * @returns The formatted duration string.
 */
export const formatDuration = (ms: number): string => {
  if (isNaN(ms) || ms < 0) {
    return '0:00'
  }
  const totalSeconds = Math.floor(ms / 1000)
  const minutes = Math.floor(totalSeconds / 60)
  const seconds = totalSeconds % 60
  return `${minutes}:${seconds.toString().padStart(2, '0')}`
}