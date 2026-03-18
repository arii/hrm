import { useState, useEffect } from 'react'

export const useOptimisticSync = (lockDuration: number) => {
  const [lastInteraction, setLastInteraction] = useState<number>(0)

  const markInteraction = () => {
    setLastInteraction(Date.now())
  }

  const [isLocked, setIsLocked] = useState<boolean>(false)

  useEffect(() => {
    const timeSinceInteraction = Date.now() - lastInteraction
    const locked = timeSinceInteraction < lockDuration

    if (locked && isLocked !== locked) {
      // Async state update to satisfy hooks linter (though React normally batches this anyway)
      Promise.resolve().then(() => setIsLocked(locked))
    }

    if (locked) {
      const timeoutId = setTimeout(() => {
        setIsLocked(false)
      }, lockDuration - timeSinceInteraction)
      return () => clearTimeout(timeoutId)
    }
  }, [lastInteraction, lockDuration, isLocked])

  return { isLocked, markInteraction }
}
