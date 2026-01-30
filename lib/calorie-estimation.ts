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

export interface CalorieEstimationParams {
  heartRate: number
  age: number
  weightKg: number
  durationMinutes: number
  isMale?: boolean
}

/**
 * Constants used in the calorie estimation formula.
 * These values are derived from the Journal of Sports Sciences:
 * https://www.tandfonline.com/doi/abs/10.1080/02640410400023363
 */
const MALE_CONSTANTS = {
  INTERCEPT: -55.0969,
  HR_FACTOR: 0.6309,
  WEIGHT_FACTOR: 0.1988,
  AGE_FACTOR: 0.2017,
  KJ_TO_KCAL: 4.184,
}

const FEMALE_CONSTANTS = {
  INTERCEPT: -20.4022,
  HR_FACTOR: 0.4472,
  WEIGHT_FACTOR: -0.1263, // Note: Weight factor is negative for females in this model
  AGE_FACTOR: 0.074,
  KJ_TO_KCAL: 4.184,
}

/**
 * Estimates calories burned using a gender-specific formula.
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
  const { heartRate, age, weightKg, durationMinutes, isMale = true } = params

  if (heartRate <= 30 || durationMinutes <= 0) {
    return 0
  }

  const constants = isMale ? MALE_CONSTANTS : FEMALE_CONSTANTS

  const heartRateTerm = constants.HR_FACTOR * heartRate
  const weightTerm = constants.WEIGHT_FACTOR * weightKg
  const ageTerm = constants.AGE_FACTOR * age
  const caloriesPerMinute =
    (constants.INTERCEPT + heartRateTerm + weightTerm + ageTerm) /
    constants.KJ_TO_KCAL

  const totalCalories = caloriesPerMinute * durationMinutes
  return Math.max(0, totalCalories) // Ensure result is non-negative
}
