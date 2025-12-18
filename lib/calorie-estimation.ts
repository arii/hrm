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
 * This paper provides gender-specific formulas. This module implements both
 * and a gender-neutral fallback.
 */

/**
 * The formula to use for calorie estimation.
 * 'GenderSpecific' is recommended for higher accuracy.
 */
export enum CalorieEstimationFormula {
  GenderSpecific = 'GenderSpecific',
  GenderNeutral = 'GenderNeutral',
}

export enum Gender {
  Male = 'male',
  Female = 'female',
}

export interface CalorieEstimationParams {
  heartRate: number
  age: number
  weightKg: number
  durationMinutes: number
  gender?: Gender
  formula?: CalorieEstimationFormula
}

/**
 * Constants for the male-specific (and default gender-neutral) calorie estimation formula.
 */
const CALORIE_CONSTANTS_MALE = {
  INTERCEPT: -55.0969,
  HR_FACTOR: 0.6309,
  WEIGHT_FACTOR: 0.1988,
  AGE_FACTOR: 0.2017,
  KJ_TO_KCAL: 4.184,
}

/**
 * Constants for the female-specific calorie estimation formula.
 */
const CALORIE_CONSTANTS_FEMALE = {
  INTERCEPT: -20.4022,
  HR_FACTOR: 0.4472,
  WEIGHT_FACTOR: -0.1263, // Note: This is a negative factor
  AGE_FACTOR: 0.074,
  KJ_TO_KCAL: 4.184,
}

/**
 * Estimates calories burned using the most appropriate formula based on available data.
 *
 * This function will use gender-specific formulas if a gender is provided, which is
 * the recommended approach for accuracy. If no gender is provided, it falls back
 * to a gender-neutral formula.
 *
 * @param params - The physiological data for the calculation.
 * @returns The estimated number of calories burned.
 */
export const estimateCaloriesBurned = (
  params: CalorieEstimationParams
): number => {
  const {
    heartRate,
    age,
    weightKg,
    durationMinutes,
    gender,
    formula = CalorieEstimationFormula.GenderSpecific,
  } = params

  if (heartRate <= 30 || durationMinutes <= 0) {
    return 0
  }

  // Default to the male/gender-neutral constants.
  let constants = CALORIE_CONSTANTS_MALE

  // Use the female-specific formula if requested and applicable.
  if (formula === CalorieEstimationFormula.GenderSpecific && gender === Gender.Female) {
    constants = CALORIE_CONSTANTS_FEMALE
  }

  const heartRateTerm = constants.HR_FACTOR * heartRate
  const weightTerm = constants.WEIGHT_FACTOR * weightKg
  const ageTerm = constants.AGE_FACTOR * age

  const caloriesPerMinute =
    (constants.INTERCEPT + heartRateTerm + weightTerm + ageTerm) /
    constants.KJ_TO_KCAL

  const totalCalories = caloriesPerMinute * durationMinutes
  return Math.max(0, totalCalories) // Ensure result is non-negative
}
