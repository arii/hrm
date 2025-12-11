// utils/time.ts

/**
 * Formats a duration in seconds into HH:MM:SS format.
 * @param seconds - The duration in seconds.
 * @returns The formatted time string.
 */
export const formatDuration = (seconds: number): string => {
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
