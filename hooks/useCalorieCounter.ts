// File: hooks/useCalorieCounter.ts
import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import { estimateCaloriesBurned } from '../lib/calorie-estimation'

/**
 * A hook to calculate and manage calories burned during a workout.
 * It accumulates calories every second based on the current heart rate, age, and weight.
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
  const latestHeartRate = useRef(heartRate)

  useEffect(() => {
    latestHeartRate.current = heartRate
  }, [heartRate])

  useEffect(() => {
    if (!isActive) {
      return
    }

    const interval = setInterval(() => {
      if (latestHeartRate.current > 0) {
        const caloriesPerSecond = estimateCaloriesBurned({
          heartRate: latestHeartRate.current,
          age,
          weightKg: weight,
          durationMinutes: 1 / 60, // Calculate for one second
        })
        setCalories((prevCalories) => prevCalories + caloriesPerSecond)
      }
    }, 1000)

    return () => clearInterval(interval)
  }, [isActive, age, weight])

  const resetCalories = useCallback(() => {
    setCalories(0)
  }, [])

  return useMemo(() => ({ calories, resetCalories }), [calories, resetCalories])
}
