/**
 * Formats a timestamp into a human-readable "time ago" string.
 * @param timestamp The timestamp to format (in milliseconds).
 * @returns A string representing the time elapsed (e.g., "5s ago", "1m ago").
 */
export const formatTimeAgo = (timestamp: number): string => {
  const now = Date.now()
  const secondsAgo = Math.floor((now - timestamp) / 1000)

  if (secondsAgo < 60) {
    return `${secondsAgo}s ago`
  }

  const minutesAgo = Math.floor(secondsAgo / 60)
  if (minutesAgo < 60) {
    return `${minutesAgo}m ago`
  }

  const hoursAgo = Math.floor(minutesAgo / 60)
  if (hoursAgo < 24) {
    return `${hoursAgo}h ago`
  }

  const daysAgo = Math.floor(hoursAgo / 24)
  return `${daysAgo}d ago`
}
