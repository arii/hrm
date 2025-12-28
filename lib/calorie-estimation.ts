// File: lib/calorie-estimation.ts
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

import { Gender } from '../types'

export interface CalorieEstimationParams {
  heartRate: number
  age: number
  weightKg: number
  durationMinutes: number
  gender: Gender
}

/**
 * Estimates calories burned using gender-specific formulas.
 *
 * This function implements the Keytel et al. (2005) formula for calorie expenditure,
 * which provides different coefficients for males and females to improve accuracy.
 * It relies on heart rate, age, weight, and gender.
 *
 * Journal of Sports Sciences:
 * https://www.tandfonline.com/doi/abs/10.1080/02640410400023363
 *
 * @param params - The physiological data for the calculation.
 * @returns The estimated number of calories burned.
 */
export const estimateCaloriesBurned = (
  params: CalorieEstimationParams
): number => {
  const { heartRate, age, weightKg, durationMinutes, gender } = params

  if (heartRate <= 30 || durationMinutes <= 0 || !gender) {
    return 0
  }

  let caloriesPerMinute = 0
  const KJ_TO_KCAL = 4.184

  if (gender === 'MALE') {
    // Men: Calories/min = (-55.0969 + 0.6309 * HR + 0.1988 * W + 0.2017 * A) / 4.184
    caloriesPerMinute =
      (-55.0969 +
        0.6309 * heartRate +
        0.1988 * weightKg +
        0.2017 * age) /
      KJ_TO_KCAL
  } else if (gender === 'FEMALE') {
    // Women: Calories/min = (-20.4022 + 0.4472 * HR + 0.1263 * W + 0.074 * A) / 4.184
    caloriesPerMinute =
      (-20.4022 +
        0.4472 * heartRate +
        0.1263 * weightKg +
        0.074 * age) /
      KJ_TO_KCAL
  }

  const totalCalories = caloriesPerMinute * durationMinutes
  return Math.max(0, totalCalories) // Ensure result is non-negative
}
