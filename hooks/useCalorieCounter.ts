// File: hooks/useCalorieCounter.ts
import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import { estimateCaloriesBurned } from '../lib/calorie-estimation'

/**
 * A hook to calculate and manage calories burned during a workout.
 * It accumulates calories using a delta-time approach to ensure accuracy
 * and prevent drift over time.
 *
 * @param heartRate - The current heart rate in beats per minute (BPM).
 * @param age - The user's age in years.
 * @param weight - The user's weight in kilograms (kg).
 * @param isActive - A boolean flag indicating if the workout/calculation is active.
 * @returns An object containing:
 *  - `calories`: The total accumulated calories burned (number).
 *  - `resetCalories`: A function to reset the calorie count to 0.
 */
export const useCalorieCounter = (
  heartRate: number,
  age: number,
  weight: number,
  isActive: boolean
): { calories: number; resetCalories: () => void } => {
  const [calories, setCalories] = useState(0)
  const lastTickRef = useRef<number | null>(null)

  // Refs to hold the latest values of frequently-changing props
  // This prevents the interval from resetting every time they change.
  const heartRateRef = useRef(heartRate)
  const ageRef = useRef(age)
  const weightRef = useRef(weight)

  // Effect to keep the refs updated with the latest prop values
  useEffect(() => {
    heartRateRef.current = heartRate
    ageRef.current = age
    weightRef.current = weight
  }, [heartRate, age, weight])

  useEffect(() => {
    if (!isActive) {
      lastTickRef.current = null
      return
    }

    // Initialize the baseline time when activation starts
    lastTickRef.current = Date.now()

    const tick = () => {
      const now = Date.now()
      if (lastTickRef.current) {
        const deltaSeconds = (now - lastTickRef.current) / 1000
        // Use the ref's current value for calculation
        if (heartRateRef.current > 0) {
          const caloriesBurned = estimateCaloriesBurned({
            heartRate: heartRateRef.current,
            age: ageRef.current,
            weightKg: weightRef.current,
            durationMinutes: deltaSeconds / 60,
          })
          setCalories((prev) => prev + caloriesBurned)
        }
      }
      lastTickRef.current = now
    }

    const interval = setInterval(tick, 1000)
    return () => clearInterval(interval)
    // The interval should only be reset when the `isActive` flag changes.
    // Other dependencies like `heartRate`, `age`, and `weight` are managed
    // via refs to avoid resetting the interval on every change.
  }, [isActive])

  const resetCalories = useCallback(() => {
    setCalories(0)
    lastTickRef.current = null
  }, [])

  return useMemo(() => ({ calories, resetCalories }), [calories, resetCalories])
}
