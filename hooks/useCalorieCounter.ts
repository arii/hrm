// File: hooks/useCalorieCounter.ts
import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import { estimateCaloriesBurned } from '../lib/calorie-estimation'
import { Gender } from '../../types/core'

// Define the size of the moving average window
const SMA_WINDOW_SIZE = 5

/**
 * A hook to calculate and manage calories burned during a workout.
 * It accumulates calories using a delta-time approach and smooths the heart rate
 * input using a Simple Moving Average (SMA) to ensure accuracy.
 *
 * @param heartRate - The current raw heart rate in beats per minute (BPM).
 * @param age - The user's age in years.
 * @param weight - The user's weight in kilograms (kg).
 * @param gender - The user's gender.
 * @param isActive - A boolean flag indicating if the workout/calculation is active.
 * @returns An object containing:
 *  - `calories`: The total accumulated calories burned (number).
 *  - `smoothedHeartRate`: The heart rate after applying the SMA filter.
 *  - `resetCalories`: A function to reset the calorie count and HR buffer.
 */
export const useCalorieCounter = (
  heartRate: number,
  age: number,
  weight: number,
  gender: Gender,
  isActive: boolean
): {
  calories: number
  smoothedHeartRate: number
  resetCalories: () => void
} => {
  const [calories, setCalories] = useState(0)
  const [smoothedHeartRate, setSmoothedHeartRate] = useState(0)
  const lastTickRef = useRef<number | null>(null)
  const hrBufferRef = useRef<number[]>([])

  // Refs for props to avoid stale closures in the interval
  const ageRef = useRef(age)
  const weightRef = useRef(weight)
  const genderRef = useRef(gender)
  const smoothedHeartRateRef = useRef(smoothedHeartRate)

  // Effect to keep refs updated with the latest prop/state values
  useEffect(() => {
    ageRef.current = age
    weightRef.current = weight
    genderRef.current = gender
    smoothedHeartRateRef.current = smoothedHeartRate
  }, [age, weight, gender, smoothedHeartRate])

  // Effect to manage the heart rate buffer and calculate the smoothed value
  useEffect(() => {
    // Only update buffer if the workout is active and HR is valid
    if (isActive && heartRate > 0) {
      const buffer = hrBufferRef.current
      buffer.push(heartRate)
      if (buffer.length > SMA_WINDOW_SIZE) {
        buffer.shift() // Maintain the window size
      }
      const sum = buffer.reduce((acc, val) => acc + val, 0)
      const average = buffer.length > 0 ? Math.round(sum / buffer.length) : 0
      setSmoothedHeartRate(average)
    } else if (!isActive) {
      // If workout becomes inactive, reset the buffer immediately
      hrBufferRef.current = []
      setSmoothedHeartRate(0)
    }
    // Dependency on `heartRate` is key. `isActive` is also important to control buffer updates.
  }, [heartRate, isActive])

  useEffect(() => {
    if (!isActive) {
      lastTickRef.current = null
      return
    }

    lastTickRef.current = Date.now()

    const tick = () => {
      const now = Date.now()
      if (lastTickRef.current) {
        const deltaSeconds = (now - lastTickRef.current) / 1000

        // Use the ref's current value for calculation to avoid stale closure
        if (smoothedHeartRateRef.current > 0) {
          const caloriesBurned = estimateCaloriesBurned({
            heartRate: smoothedHeartRateRef.current,
            age: ageRef.current,
            weightKg: weightRef.current,
            gender: genderRef.current,
            durationMinutes: deltaSeconds / 60,
          })
          setCalories((prev) => prev + caloriesBurned)
        }
      }
      lastTickRef.current = now
    }

    const interval = setInterval(tick, 1000)
    return () => clearInterval(interval)
  }, [isActive])

  const resetCalories = useCallback(() => {
    setCalories(0)
    setSmoothedHeartRate(0)
    hrBufferRef.current = []
    lastTickRef.current = null
  }, [])

  return useMemo(
    () => ({ calories, smoothedHeartRate, resetCalories }),
    [calories, smoothedHeartRate, resetCalories]
  )
}
