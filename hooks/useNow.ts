'use client'
import { useState, useEffect } from 'react'

/**
 * A hook that returns the current timestamp and updates every second.
 * This is useful for reactive components that depend on the passage of time.
 * Using this hook avoids lint errors related to calling Date.now() during render.
 */
export const useNow = (intervalMs: number = 1000) => {
  const [now, setNow] = useState(() => Date.now())

  useEffect(() => {
    const interval = setInterval(() => {
      setNow(Date.now())
    }, intervalMs)

    return () => clearInterval(interval)
  }, [intervalMs])

  return now
}
