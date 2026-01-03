// File: utils/formatters.ts
/**
 * Formats a duration in milliseconds to a string.
 * If the duration is less than an hour, the format is MM:SS.
 * If the duration is an hour or more, the format is HH:MM:SS.
 * @param ms The duration in milliseconds.
 * @returns A string in HH:MM:SS or MM:SS format.
 */
export const formatDuration = (ms: number): string => {
  const totalSeconds = Math.floor(ms / 1000)
  const hours = Math.floor(totalSeconds / 3600)
  const minutes = Math.floor((totalSeconds % 3600) / 60)
  const seconds = totalSeconds % 60

  const paddedMinutes = minutes.toString().padStart(2, '0')
  const paddedSeconds = seconds.toString().padStart(2, '0')

  if (hours > 0) {
    return `${hours}:${paddedMinutes}:${paddedSeconds}`
  } else {
    return `${paddedMinutes}:${paddedSeconds}`
  }
}
