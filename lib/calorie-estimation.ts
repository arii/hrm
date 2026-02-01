// lib/calorie-estimation.ts
import { Gender } from '@/types/user'

export interface CalorieEstimationParams {
  heartRate: number
  age: number
  weightKg: number
  durationMinutes: number
  gender?: Gender
}

/**
 * Estimates calories burned using the Karvonen formula, which is widely
 * used for its accuracy by incorporating heart rate.
 *
 * The formula differs based on gender to provide more accurate estimations:
 * - Male: (-55.0969 + 0.6309 × HR + 0.1988 × weight + 0.2017 × age) / 4.184
 * - Female: (-20.4022 + 0.4472 × HR - 0.1263 × weight + 0.074 × age) / 4.184
 *
 * A 'neutral' option is provided, which defaults to the female formula as a
 * conservative estimate when gender is not specified.
 *
 * Reference: Journal of Sports Sciences
 *
 * @param params - The parameters for the calorie estimation.
 * @returns The estimated number of calories burned.
 */
export const estimateCaloriesBurned = ({
  heartRate,
  age,
  weightKg,
  durationMinutes,
  gender = 'neutral',
}: CalorieEstimationParams): number => {
  if (durationMinutes <= 0 || heartRate < 30) {
    return 0
  }

  // Karvonen formula - gender-specific coefficients
  let caloriesPerMinute: number

  if (gender === 'male') {
    caloriesPerMinute =
      (-55.0969 + 0.6309 * heartRate + 0.1988 * weightKg + 0.2017 * age) / 4.184
  } else {
    // For 'female' and 'neutral', we use the more conservative female formula.
    caloriesPerMinute =
      (-20.4022 + 0.4472 * heartRate - 0.1263 * weightKg + 0.074 * age) / 4.184
  }

  if (caloriesPerMinute <= 0) {
    return 0
  }

  return caloriesPerMinute * durationMinutes
}
