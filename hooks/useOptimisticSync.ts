import { useCallback, useRef } from 'react'

export const useOptimisticSync = (lockDuration: number) => {
  const lastInteractionRef = useRef<number>(0)

  const markInteraction = useCallback(() => {
    lastInteractionRef.current = Date.now()
  }, [])

  const isLocked = useCallback(() => {
    return Date.now() - lastInteractionRef.current < lockDuration
  }, [lockDuration])

  const unlock = useCallback(() => {
    lastInteractionRef.current = 0
  }, [])

  return { isLocked, markInteraction, unlock }
}
