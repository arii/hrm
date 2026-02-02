import { useEffect, useReducer } from 'react'

const STALE_THRESHOLD = 15 * 1000 // 15 seconds

const isTimestampStale = (timestamp: number | null): boolean => {
  if (timestamp === null) {
    return true
  }
  return Date.now() - timestamp > STALE_THRESHOLD
}

export const useDataFreshness = (timestamp: number | null): boolean => {
  const [, forceUpdate] = useReducer((x) => x + 1, 0)

  useEffect(() => {
    const intervalId = setInterval(() => {
      forceUpdate()
    }, 5000) // Check every 5 seconds

    return () => clearInterval(intervalId)
  }, [])

  return isTimestampStale(timestamp)
}
