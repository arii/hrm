// File: hooks/useCalorieCounter.ts
import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import { estimateCaloriesBurned } from '../lib/calorie-estimation'
import { Gender } from '../../types/core'

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
 * @param options - Configuration options for the hook.
 * @param options.smaWindow - The number of samples for the Simple Moving Average.
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
  isActive: boolean,
  options: { smaWindow?: number } = {}
): {
  calories: number
  smoothedHeartRate: number
  resetCalories: () => void
} => {
  const { smaWindow = 5 } = options
  const [calories, setCalories] = useState(0)
  const [smoothedHeartRate, setSmoothedHeartRate] = useState(
    isActive && heartRate > 0 ? heartRate : 0
  )
  const lastTickRef = useRef<number | null>(null)
  const hrBufferRef = useRef<number[]>([])

  // Effect to manage the heart rate buffer and calculate the smoothed value
  useEffect(() => {
    if (!isActive) {
      hrBufferRef.current = []
      setSmoothedHeartRate(0) // Reset HR when inactive
      return
    }

    if (heartRate > 0) {
      const buffer = hrBufferRef.current
      buffer.push(heartRate)
      if (buffer.length > smaWindow) {
        buffer.shift()
      }
      const sum = buffer.reduce((acc, val) => acc + val, 0)
      const average = buffer.length > 0 ? Math.round(sum / buffer.length) : 0
      setSmoothedHeartRate(average)
    }
  }, [heartRate, isActive, smaWindow])

  // Effect to calculate calories based on changes in smoothed HR
  useEffect(() => {
    if (!isActive || smoothedHeartRate <= 0) {
      lastTickRef.current = null // Stop accumulating when inactive or HR is zero
      return
    }

    const now = Date.now()
    const lastTick = lastTickRef.current

    // We need a previous tick to calculate a delta
    if (lastTick) {
      const deltaSeconds = (now - lastTick) / 1000
      // Avoid calculating for tiny deltas or if time goes backward
      if (deltaSeconds > 0) {
        const caloriesBurned = estimateCaloriesBurned({
          heartRate: smoothedHeartRate,
          age: age,
          weightKg: weight,
          gender: gender,
          durationMinutes: deltaSeconds / 60,
        })
        setCalories((prev) => prev + caloriesBurned)
      }
    }

    // Always update the last tick time for the next calculation
    lastTickRef.current = now
  }, [smoothedHeartRate, isActive, age, weight, gender])

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
