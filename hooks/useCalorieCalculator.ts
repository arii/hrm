// File: hooks/useCalorieCalculator.ts
import { useState, useRef, useCallback, useEffect } from 'react'
import { estimateCaloriesBurned } from '../lib/calorie-estimation'

interface CalorieCalculatorProps {
  age: number
  weightKg: number
  smoothingWindow?: number
}

/**
 * A hook for real-time calorie calculation based on heart rate data.
 * It features a Simple Moving Average (SMA) for smoothing HR input and
 * uses a delta-time approach for accurate calorie accumulation.
 *
 * @param {CalorieCalculatorProps} props - The user's metabolic data.
 * @returns An object with the calculated calories and control functions.
 */
export const useCalorieCalculator = ({
  age,
  weightKg,
  smoothingWindow = 5, // Default to a 5-sample window for SMA
}: CalorieCalculatorProps) => {
  const [calories, setCalories] = useState(0)
  const lastTimestampRef = useRef<number | null>(null)
  const hrHistoryRef = useRef<number[]>([])

  const ageRef = useRef(age)
  const weightKgRef = useRef(weightKg)

  // Keep refs updated to avoid stale closures in callbacks
  useEffect(() => {
    ageRef.current = age
    weightKgRef.current = weightKg
  }, [age, weightKg])

  /**
   * Processes a new heart rate measurement.
   * - Smooths the HR value using a Simple Moving Average.
   * - Calculates the time delta since the last measurement.
   * - Estimates calories burned for the delta time and accumulates it.
   *
   * @param {number} heartRate - The raw heart rate from the sensor.
   */
  const processHeartRate = useCallback(
    (heartRate: number) => {
      const now = Date.now()

      // 1. Simple Moving Average (SMA) for smoothing
      hrHistoryRef.current.push(heartRate)
      if (hrHistoryRef.current.length > smoothingWindow) {
        hrHistoryRef.current.shift()
      }
      const sum = hrHistoryRef.current.reduce((a, b) => a + b, 0)
      const smoothedHr = sum / hrHistoryRef.current.length

      // 2. Delta-time calculation and calorie accumulation
      if (lastTimestampRef.current && smoothedHr > 30) {
        const dtSeconds = (now - lastTimestampRef.current) / 1000

        // Prevent calculating calories for large time gaps (e.g., tab backgrounding)
        if (dtSeconds > 0 && dtSeconds < 10) {
          const dtMinutes = dtSeconds / 60
          const caloriesBurned = estimateCaloriesBurned({
            heartRate: smoothedHr,
            age: ageRef.current,
            weightKg: weightKgRef.current,
            durationMinutes: dtMinutes,
          })
          setCalories((prev) => prev + caloriesBurned)
        }
      }

      lastTimestampRef.current = now
    },
    [smoothingWindow]
  )

  /**
   * Resets the calorie counter and all internal state.
   */
  const reset = useCallback(() => {
    setCalories(0)
    lastTimestampRef.current = null
    hrHistoryRef.current = []
  }, [])

  return { calories, processHeartRate, reset }
}
