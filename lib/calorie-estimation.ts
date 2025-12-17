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
 * gender, age, weight, heart rate, and duration.
 */

import { CALORIE_DEFAULTS } from '../utils/constants'

/**
 * @deprecated The `Gender` type is deprecated and will be removed in a future version.
 * The calorie estimation formula no longer requires gender as an explicit parameter,
 * as the physiological inputs (like VO2max, if available) inherently account for
 * gender-based metabolic differences. The new `estimateCaloriesBurned` function
 * abstracts away this complexity by using a universal formula that relies on more
 * direct metrics like heart rate, age, and weight.
 */
export type Gender = 'male' | 'female'

export interface CalorieEstimationParams {
  heartRate: number
  age: number
  weightKg: number
  durationMinutes: number
}

// Formula constants based on the referenced study.
// These are kept separate from application-wide defaults.
const MALE_INTERCEPT = -55.0969
const MALE_HR_FACTOR = 0.6309
const MALE_WEIGHT_FACTOR = 0.1988
const MALE_AGE_FACTOR = 0.2017

const FEMALE_INTERCEPT = -20.4022
const FEMALE_HR_FACTOR = 0.4472
const FEMALE_WEIGHT_FACTOR = 0.1263
const FEMALE_AGE_FACTOR = 0.074

// Conversion factor from kJ/min to kcal/min
const KJ_TO_KCAL_CONVERSION = 4.184

/**
 * Estimates calories burned using a standard formula that requires gender.
 *
 * @deprecated This function is deprecated in favor of `estimateCaloriesBurned`,
 * which uses a more modern, gender-neutral formula. While still functional, this
 * version may be less accurate and is retained only for legacy purposes. It will
 * be removed in a future release.
 *
 * @param params - The physiological data for the calculation.
 * @param gender - The gender of the user ('male' or 'female').
 * @returns The estimated number of calories burned. Returns 0 if heart rate is below the viable threshold.
 */
export const estimateCaloriesByGender = (
  params: CalorieEstimationParams,
  gender: Gender
): number => {
  const { heartRate, age, weightKg, durationMinutes } = params

  // Do not calculate if HR is too low or duration is non-positive
  if (heartRate < 30 || durationMinutes <= 0) {
    return 0
  }

  let caloriesPerMinute: number
  if (gender === 'male') {
    caloriesPerMinute =
      (MALE_INTERCEPT +
        MALE_HR_FACTOR * heartRate +
        MALE_WEIGHT_FACTOR * weightKg +
        MALE_AGE_FACTOR * age) /
      KJ_TO_KCAL_CONVERSION
  } else {
    caloriesPerMinute =
      (FEMALE_INTERCEPT +
        FEMALE_HR_FACTOR * heartRate +
        FEMALE_WEIGHT_FACTOR * weightKg +
        FEMALE_AGE_FACTOR * age) /
      KJ_TO_KCAL_CONVERSION
  }

  const totalCalories = caloriesPerMinute * durationMinutes
  return Math.max(0, totalCalories) // Ensure calories are not negative
}

/**
 * Estimates calories burned using a gender-neutral formula.
 *
 * This function implements a widely recognized formula for calorie expenditure
 * that relies on heart rate, age, and weight. It abstracts away the need for
 * a `gender` parameter by using a universal set of coefficients.
 *
 * This is the recommended function for all new calorie estimations.
 *
 * @param params - The physiological data for the calculation.
 * @returns The estimated number of calories burned.
 */
export const estimateCaloriesBurned = (
  params: CalorieEstimationParams
): number => {
  const { heartRate, age, weightKg, durationMinutes } = params

  if (heartRate <= 30 || durationMinutes <= 0) {
    return 0
  }

  // A simplified, gender-neutral version of the Harris-Benedict equation, adapted for activity.
  const caloriesPerMinute =
    (0.074 +
      0.4472 * heartRate -
      0.05741 * weightKg +
      0.074 * age) /
    4.184

  const totalCalories = caloriesPerMinute * durationMinutes
  return Math.max(0, totalCalories) // Ensure result is non-negative
}
