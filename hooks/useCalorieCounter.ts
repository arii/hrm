// hooks/useCalorieCounter.ts
import { useState, useRef, useCallback } from 'react'

type Gender = 'male' | 'female'

/**
 * @interface UserProfile
 * @description Represents the user's profile data required for calorie calculation.
 */
interface UserProfile {
  age: number
  weight: number
  gender: Gender
}

const SMA_WINDOW_SIZE = 5

const MALE_CALS = {
  BASE: -55.0969,
  HR_COEFF: 0.6309,
  WEIGHT_COEFF: 0.1988,
  AGE_COEFF: 0.2017,
}

const FEMALE_CALS = {
  BASE: -20.4022,
  HR_COEFF: 0.4472,
  WEIGHT_COEFF: -0.1263,
  AGE_COEFF: 0.074,
}

const KCAL_PER_KJ = 4.184

/**
 * @hook useCalorieCounter
 * @description A hook to calculate calories based on heart rate, age, weight, and gender.
 * @param {UserProfile} userProfile - The user's profile data.
 * @returns {{addReading: (heartRate: number) => {smoothedHr: number, totalCalories: number}, totalCalories: number}}
 * - `addReading`: A function to add a new heart rate reading and get the updated smoothed HR and total calories.
 * - `totalCalories`: The total accumulated calories.
 */
export const useCalorieCounter = (userProfile: UserProfile) => {
  const [totalCalories, setTotalCalories] = useState(0)
  const lastReadingTime = useRef<number | null>(null)
  const hrBuffer = useRef<number[]>([])

  /**
   * @function addReading
   * @description Adds a new heart rate reading and calculates the calories burned since the last reading.
   * @param {number} heartRate - The current heart rate.
   * @returns {{smoothedHr: number, totalCalories: number}} - The smoothed heart rate and the new total calories.
   */
  const addReading = useCallback(
    (heartRate: number) => {
      const now = Date.now()
      let caloriesThisInterval = 0
      let smoothedHr = heartRate

      if (lastReadingTime.current) {
        const dt = (now - lastReadingTime.current) / 1000 // in seconds

        // Simple Moving Average (SMA) for smoothing
        hrBuffer.current.push(heartRate)
        if (hrBuffer.current.length > SMA_WINDOW_SIZE) {
          hrBuffer.current.shift()
        }
        smoothedHr =
          hrBuffer.current.reduce((a, b) => a + b, 0) / hrBuffer.current.length

        let caloriesPerMinute = 0
        if (userProfile.age > 0 && userProfile.weight > 0) {
          if (userProfile.gender === 'male') {
            caloriesPerMinute =
              (MALE_CALS.BASE +
                MALE_CALS.HR_COEFF * smoothedHr +
                MALE_CALS.WEIGHT_COEFF * userProfile.weight +
                MALE_CALS.AGE_COEFF * userProfile.age) /
              KCAL_PER_KJ
          } else {
            caloriesPerMinute =
              (FEMALE_CALS.BASE +
                FEMALE_CALS.HR_COEFF * smoothedHr +
                FEMALE_CALS.WEIGHT_COEFF * userProfile.weight +
                FEMALE_CALS.AGE_COEFF * userProfile.age) /
              KCAL_PER_KJ
          }
        }

        const instantCaloriesPerSec = caloriesPerMinute / 60
        caloriesThisInterval = instantCaloriesPerSec * dt

        if (caloriesThisInterval > 0) {
          setTotalCalories((prev) => prev + caloriesThisInterval)
        }
      }

      lastReadingTime.current = now
      const newTotalCalories =
        totalCalories + (caloriesThisInterval > 0 ? caloriesThisInterval : 0)
      return { smoothedHr, totalCalories: newTotalCalories }
    },
    [totalCalories, userProfile]
  )

  return { addReading, totalCalories }
}
