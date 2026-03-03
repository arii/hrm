import { useState, useRef, useCallback, useEffect } from 'react'

/**
 * A hook that provides a locking mechanism for a specified duration.
 * Useful for ignoring external state updates during or after user interaction (Optimistic UI).
 *
 * @param durationMs The duration of the lock in milliseconds.
 * @returns An object containing the current lock state and a function to activate/refresh the lock.
 */
export const useInteractionLock = (durationMs: number) => {
  const [isLocked, setIsLocked] = useState(false)
  const timeoutRef = useRef<NodeJS.Timeout | null>(null)

  const lock = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current)
    }
    setIsLocked(true)
    timeoutRef.current = setTimeout(() => {
      setIsLocked(false)
      timeoutRef.current = null
    }, durationMs)
  }, [durationMs])

  useEffect(() => {
    // Cleanup on unmount
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
      }
    }
  }, [])

  return { isLocked, lock }
}
