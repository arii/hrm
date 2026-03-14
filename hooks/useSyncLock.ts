import { useRef, useCallback } from 'react'

export const useSyncLock = (duration: number) => {
  const lastInteractionRef = useRef<number>(0)

  const isLocked = useCallback(
    () => Date.now() - lastInteractionRef.current < duration,
    [duration]
  )
  const updateInteraction = useCallback(() => {
    lastInteractionRef.current = Date.now()
  }, [])

  return { isLocked, updateInteraction }
}
