// hooks/useWorkoutMetrics.ts
import { useState, useEffect, useMemo } from 'react'
import { calculateCaloriesBurned } from '@/utils/health'
import { formatDuration } from '@/utils/time'

interface UseWorkoutMetricsProps {
  currentHR: number
  userAge: number
  timeElapsed: number
}

export function useWorkoutMetrics({
  currentHR,
  userAge,
  timeElapsed,
}: UseWorkoutMetricsProps) {
  const [hrSum, setHrSum] = useState<number>(0)
  const [hrCount, setHrCount] = useState<number>(0)

  useEffect(() => {
    if (timeElapsed === 0) {
      setHrSum(0)
      setHrCount(0)
    } else if (currentHR > 0) {
      setHrSum((prevSum) => prevSum + currentHR)
      setHrCount((prevCount) => prevCount + 1)
    }
  }, [currentHR, timeElapsed])

  const averageHr = hrCount > 0 ? hrSum / hrCount : 0
  const isWorkoutActive = timeElapsed > 0

  const caloriesBurned = userAge
    ? calculateCaloriesBurned(averageHr, userAge, timeElapsed)
    : 0

  return useMemo(
    () => ({
      workoutDuration: formatDuration(timeElapsed),
      caloriesBurned: caloriesBurned.toFixed(0),
      isWorkoutActive,
    }),
    [timeElapsed, caloriesBurned, isWorkoutActive]
  )
}
