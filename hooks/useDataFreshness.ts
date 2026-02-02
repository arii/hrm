import { useEffect, useReducer } from 'react'

const STALE_THRESHOLD = 15 * 1000 // 15 seconds
const REFRESH_INTERVAL = 5 * 1000 // 5 seconds

const isTimestampStale = (timestamp: number | null): boolean => {
  if (timestamp === null) {
    return true
  }
  return Date.now() - timestamp > STALE_THRESHOLD
}

export const useDataFreshness = (timestamp: number | null): boolean => {
  const [, forceUpdate] = useReducer((x) => x + 1, 0)

  useEffect(() => {
    // Set up a periodic refresh to update the "time ago" text.
    const intervalId = setInterval(forceUpdate, REFRESH_INTERVAL)

    // Also set up a precise timeout to trigger a re-render exactly when the
    // data becomes stale, in case the interval misses the exact moment.
    let staleTimeoutId: NodeJS.Timeout | undefined
    if (timestamp !== null) {
      const timeSinceData = Date.now() - timestamp
      if (timeSinceData < STALE_THRESHOLD) {
        const timeUntilStale = STALE_THRESHOLD - timeSinceData
        // Add a 1ms buffer to ensure the staleness check passes.
        staleTimeoutId = setTimeout(forceUpdate, timeUntilStale + 1)
      }
    }

    return () => {
      clearInterval(intervalId)
      if (staleTimeoutId) {
        clearTimeout(staleTimeoutId)
      }
    }
  }, [timestamp]) // Rerun effect if the timestamp changes

  return isTimestampStale(timestamp)
}
