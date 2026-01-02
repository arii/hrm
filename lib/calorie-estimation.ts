// File: lib/calorie-estimation.ts
import { Gender } from '../types/core'

/**
 * Calorie Estimation Module
 *
 * This module provides functions for estimating calorie expenditure based on
 * physiological data. It is designed to be a standalone, testable unit.
 *
 * The primary estimation uses a formula derived from the Journal of Sports Sciences:
 * https://www.tandfonline.com/doi/abs/10.1080/02640410400023363
 *
 * The formula is adapted for use with METs (Metabolic Equivalents) and accounts for
 * age, weight, heart rate, and duration.
 */

export interface CalorieEstimationParams {
  heartRate: number
  age: number
  weightKg: number
  durationMinutes: number
  gender?: Gender
}

/**
 * Estimates calories burned using gender-specific formulas for accuracy.
 *
 * This function implements a widely recognized formula for calorie expenditure
 * that relies on heart rate, age, weight, and gender.
 *
 * @param params - The physiological data for the calculation.
 * @returns The estimated number of calories burned.
 */
export const estimateCaloriesBurned = (
  params: CalorieEstimationParams
): number => {
  const { heartRate, age, weightKg, durationMinutes, gender } = params

  if (heartRate <= 30 || durationMinutes <= 0) {
    return 0
  }

  let caloriesPerMinute: number

  // Formulas derived from: https://www.tandfonline.com/doi/abs/10.1080/02640410400023363
  // The result is in kJ/min, so we divide by 4.184 to get kcal/min (Calories).
  if (gender === 'FEMALE') {
    // Female formula
    caloriesPerMinute =
      (-20.4022 +
        0.4472 * heartRate -
        0.1263 * weightKg +
        0.074 * age) /
      4.184
  } else {
    // Male formula (default)
    caloriesPerMinute =
      (-55.0969 +
        0.6309 * heartRate +
        0.1988 * weightKg +
        0.2017 * age) /
      4.184
  }

  const totalCalories = caloriesPerMinute * durationMinutes
  return Math.max(0, totalCalories) // Ensure result is non-negative
}
