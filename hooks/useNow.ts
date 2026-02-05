// File: hooks/useNow.ts
import { useState, useEffect } from 'react'

/**
 * A hook that returns the current timestamp, updating at a specified interval.
 *
 * @param interval - The interval in milliseconds to update the timestamp. Defaults to 1000ms.
 * @returns The current timestamp (Date.now())
 */
export const useNow = (interval = 1000) => {
  // Use lazy initialization for Date.now() to ensure purity during render
  const [now, setNow] = useState(() => Date.now())

  useEffect(() => {
    const timer = setInterval(() => {
      setNow(Date.now())
    }, interval)

    return () => clearInterval(timer)
  }, [interval])

  return now
}
