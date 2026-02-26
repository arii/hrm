import { useState, useRef, useCallback, useEffect } from 'react'

/**
 * A hook that manages a temporary lock state.
 * Useful for preventing external updates while the user is interacting.
 *
 * @param duration Duration in milliseconds to keep the lock active after the last interaction.
 * @returns { isLocked, lock }
 */
export const useInteractionLock = (duration: number) => {
  const [isLocked, setIsLocked] = useState(false)
  const timeoutRef = useRef<NodeJS.Timeout | null>(null)

  const lock = useCallback(() => {
    setIsLocked(true)
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current)
    }
    timeoutRef.current = setTimeout(() => {
      setIsLocked(false)
    }, duration)
  }, [duration])

  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
      }
    }
  }, [])

  return { isLocked, lock }
}
