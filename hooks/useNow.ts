// hooks/useNow.ts
'use client'
import { useEffect, useState } from 'react'

/**
 * A hook that provides a reactive timestamp updating every second.
 * Useful for triggering re-renders based on time passing (e.g., stale data detection).
 *
 * @param intervalMs - The interval in milliseconds at which to update the timestamp. Defaults to 1000ms.
 * @returns The current timestamp (Date.now()).
 */
export const useNow = (intervalMs: number = 1000) => {
  // Use lazy initialization to avoid calling Date.now() during the render phase
  const [now, setNow] = useState(() => Date.now())

  useEffect(() => {
    const interval = setInterval(() => {
      setNow(Date.now())
    }, intervalMs)

    return () => clearInterval(interval)
  }, [intervalMs])

  return now
}
