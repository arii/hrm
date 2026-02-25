import { useEffect, useRef } from 'react'

/**
 * Custom hook to handle intervals declaratively.
 * @param callback The function to call on every interval.
 * @param delay The delay in milliseconds, or null to stop the interval.
 */
export function useInterval(callback: () => void, delay: number | null) {
  const savedCallback = useRef(callback)

  // Remember the latest callback.
  useEffect(() => {
    savedCallback.current = callback
  }, [callback])

  // Set up the interval.
  useEffect(() => {
    if (delay === null) return

    const id = setInterval(() => savedCallback.current(), delay)
    return () => clearInterval(id)
  }, [delay])
}
