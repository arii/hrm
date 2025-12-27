// File: hooks/useCalorieCounter.ts
import { useState, useEffect, useRef, useCallback } from 'react'
import { estimateCaloriesBurned } from '../lib/calorie-estimation'

/**
 * A hook to calculate and manage calories burned during a workout.
 * @param heartRate - The current heart rate.
 * @param age - The user's age.
 * @param weight - The user's weight in kg.
 * @param isActive - A boolean to control the timer.
 * @returns An object containing the total calories burned and a function to reset the count.
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

  return { calories, resetCalories }
}
