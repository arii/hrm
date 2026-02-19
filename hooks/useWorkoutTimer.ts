import { useState, useEffect } from 'react'
import { WorkoutStatus } from '@/types/workout'

/**
 * Calculates and updates the workout duration in seconds.
 * Handles running, paused, and finished states correctly based on session timestamps.
 */
export function useWorkoutTimer(
  status: WorkoutStatus,
  startTime?: number,
  totalPaused: number = 0,
  pauseTime?: number | null,
  endTime?: number | null
) {
  const [now, setNow] = useState(() => Date.now())

  useEffect(() => {
    if (status === 'running') {
      // Update immediately on status change to running to avoid stale time
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setNow(Date.now())
      const interval = setInterval(() => {
        setNow(Date.now())
      }, 1000)
      return () => clearInterval(interval)
    }
    return undefined
  }, [status])

  if (!startTime) return 0

  let end = now
  if (status === 'finished' && endTime) {
    end = endTime
  } else if (status === 'paused' && pauseTime) {
    end = pauseTime
  }

  const elapsed = Math.max(0, end - startTime - totalPaused)
  return Math.floor(elapsed / 1000)
}
