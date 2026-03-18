import { useState, useEffect } from 'react'

export const useOptimisticSync = (lockDuration: number) => {
  const [lastInteraction, setLastInteraction] = useState<number>(0)
  const [isLocked, setIsLocked] = useState<boolean>(false)

  useEffect(() => {
    if (lastInteraction === 0) return
    const timer = setTimeout(() => setIsLocked(false), lockDuration)
    return () => clearTimeout(timer)
  }, [lastInteraction, lockDuration])

  const markInteraction = () => {
    setLastInteraction(Date.now())
    setIsLocked(true)
  }

  return { isLocked, markInteraction }
}
