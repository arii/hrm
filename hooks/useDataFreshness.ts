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
    const intervalId = setInterval(forceUpdate, REFRESH_INTERVAL)

    let staleTimeoutId: NodeJS.Timeout | undefined
    if (timestamp !== null) {
      const timeSinceData = Date.now() - timestamp
      if (timeSinceData < STALE_THRESHOLD) {
        const timeUntilStale = STALE_THRESHOLD - timeSinceData
        staleTimeoutId = setTimeout(forceUpdate, timeUntilStale + 1)
      }
    }

    return () => {
      clearInterval(intervalId)
      if (staleTimeoutId) {
        clearTimeout(staleTimeoutId)
      }
    }
  }, [timestamp])

  return isTimestampStale(timestamp)
}
