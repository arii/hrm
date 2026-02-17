import { useState, useRef, useCallback, useEffect } from 'react'
import { estimateCaloriesBurned } from '../lib/calorie-estimation'
import { CalorieDataPoint } from '../lib/workout-session-storage'
import { Gender } from '@/types/core'

interface CalorieTrackerProps {
  age: number
  weightKg: number
  gender?: Gender
  smoothingWindow?: number
}

export const useCalorieTracker = ({
  age,
  weightKg,
  gender = 'NEUTRAL',
  smoothingWindow = 5,
}: CalorieTrackerProps) => {
  const [totalCaloriesBurned, setTotalCaloriesBurned] = useState(0)
  const [calorieHistory, setCalorieHistory] = useState<CalorieDataPoint[]>([])

  const lastTimestampRef = useRef<number | null>(null)
  const hrHistoryRef = useRef<number[]>([])
  const totalCaloriesRef = useRef(0)

  const ageRef = useRef(age)
  const weightKgRef = useRef(weightKg)
  const genderRef = useRef(gender)

  useEffect(() => {
    ageRef.current = age
    weightKgRef.current = weightKg
    genderRef.current = gender
  }, [age, weightKg, gender])

  const processHeartRate = useCallback(
    (heartRate: number) => {
      const now = Date.now()

      // SMA Smoothing
      hrHistoryRef.current.push(heartRate)
      if (hrHistoryRef.current.length > smoothingWindow) {
        hrHistoryRef.current.shift()
      }
      const sum = hrHistoryRef.current.reduce((a, b) => a + b, 0)
      const smoothedHr = sum / hrHistoryRef.current.length

      if (!lastTimestampRef.current) {
        lastTimestampRef.current = now
        // Record initial data point with zero calories to avoid gaps at the start.
        const initialPoint: CalorieDataPoint = {
          time: now,
          hr: heartRate,
          caloriesPerSecond: 0,
          totalToThisPoint: 0,
        }
        setCalorieHistory((prev) => [...prev, initialPoint])
        return
      }

      const dtSeconds = (now - lastTimestampRef.current) / 1000

      // Time gap validation (0 to 10 seconds)
      if (dtSeconds > 0 && dtSeconds < 10) {
        const dtMinutes = dtSeconds / 60
        const caloriesBurnedThisInterval = estimateCaloriesBurned({
          heartRate: smoothedHr,
          age: ageRef.current,
          weightKg: weightKgRef.current,
          gender: genderRef.current,
          durationMinutes: dtMinutes,
        })

        const caloriesPerSecond = caloriesBurnedThisInterval / dtSeconds

        totalCaloriesRef.current += caloriesBurnedThisInterval

        const newDataPoint: CalorieDataPoint = {
          time: now,
          hr: heartRate,
          caloriesPerSecond,
          totalToThisPoint: totalCaloriesRef.current,
        }

        setTotalCaloriesBurned(totalCaloriesRef.current)
        setCalorieHistory((prev) => [...prev, newDataPoint])
      }

      lastTimestampRef.current = now
    },
    [smoothingWindow]
  )

  const reset = useCallback(() => {
    setTotalCaloriesBurned(0)
    setCalorieHistory([])
    lastTimestampRef.current = null
    hrHistoryRef.current = []
    totalCaloriesRef.current = 0
  }, [])

  return {
    totalCaloriesBurned,
    calorieHistory,
    processHeartRate,
    reset,
  }
}
