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

import { CALORIE_DEFAULTS } from '../utils/constants'

export interface CalorieEstimationParams {
  heartRate: number
  age: number
  weightKg: number
}

/**
 * Estimates calories burned per minute using a gender-neutral formula.
 *
 * This function implements a widely recognized formula for calorie expenditure
 * that relies on heart rate, age, and weight. It abstracts away the need for
 * a `gender` parameter by using a universal set of coefficients.
 *
 * Note: This formula provides an estimate and may not be accurate for all individuals
 * or activity types. Individual metabolic rates can vary.
 *
 * @param params - The physiological data for the calculation.
 * @returns The estimated number of calories burned per minute.
 */
export const estimateCaloriesPerMinute = (
  params: CalorieEstimationParams
): number => {
  const { heartRate, age, weightKg } = params

  if (heartRate <= 30) {
    return 0
  }

  // A simplified, gender-neutral version of the Harris-Benedict equation, adapted for activity.
  /**
   * Constants used in the calorie estimation formula.
   * These values are derived from the Journal of Sports Sciences.
   * @see https://www.tandfonline.com/doi/abs/10.1080/02640410400023363
   */
  const heartRateTerm = CALORIE_DEFAULTS.HR_FACTOR * heartRate
  const weightTerm = CALORIE_DEFAULTS.WEIGHT_FACTOR * weightKg
  const ageTerm = CALORIE_DEFAULTS.AGE_FACTOR * age
  const caloriesPerMinute =
    (CALORIE_DEFAULTS.INTERCEPT + heartRateTerm + weightTerm + ageTerm) /
    CALORIE_DEFAULTS.KJ_TO_KCAL

  return Math.max(0, caloriesPerMinute) // Ensure result is non-negative
}
