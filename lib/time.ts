// lib/time.ts

/**
 * Formats a Unix timestamp into a string.
 * @param timestamp - The Unix timestamp in milliseconds.
 * @param format - The format string (e.g., 'HH:mm:ss').
 * @returns The formatted time string.
 */
export const formatTimestamp = (timestamp: number, format: string): string => {
  const date = new Date(timestamp)
  const hours = String(date.getHours()).padStart(2, '0')
  const minutes = String(date.getMinutes()).padStart(2, '0')
  const seconds = String(date.getSeconds()).padStart(2, '0')

  return format
    .replace('HH', hours)
    .replace('mm', minutes)
    .replace('ss', seconds)
}

/**
 * Formats a duration in seconds into a string (e.g., 'HH:mm:ss').
 * @param durationInSeconds - The duration in seconds.
 * @returns The formatted duration string.
 */
export const formatDuration = (durationInSeconds: number): string => {
  const hours = Math.floor(durationInSeconds / 3600)
  const minutes = Math.floor((durationInSeconds % 3600) / 60)
  const seconds = Math.floor(durationInSeconds % 60)

  const formattedHours = String(hours).padStart(2, '0')
  const formattedMinutes = String(minutes).padStart(2, '0')
  const formattedSeconds = String(seconds).padStart(2, '0')

  return `${formattedHours}:${formattedMinutes}:${formattedSeconds}`
}
