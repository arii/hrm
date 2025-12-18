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
  weightKg?: number
  durationMinutes: number
  heightCm?: number
  gender?: 'male' | 'female' | 'other'
}

/**
 * Calculates Basal Metabolic Rate (BMR) using the Mifflin-St Jeor equation.
 * @param weightKg - Weight in kilograms.
 * @param heightCm - Height in centimeters.
 * @param age - Age in years.
 * @param gender - Gender of the user.
 * @returns BMR in kcal/day.
 */
const calculateBMR = (
  weightKg: number,
  heightCm: number,
  age: number,
  gender: 'male' | 'female' | 'other'
): number => {
  if (gender === 'male') {
    return 10 * weightKg + 6.25 * heightCm - 5 * age + 5
  }
  if (gender === 'female') {
    return 10 * weightKg + 6.25 * heightCm - 5 * age - 161
  }
  // For 'other', we take an average of male and female BMRs.
  const bmrMale = 10 * weightKg + 6.25 * heightCm - 5 * age + 5
  const bmrFemale = 10 * weightKg + 6.25 * heightCm - 5 * age - 161
  return (bmrMale + bmrFemale) / 2
}

/**
 * Estimates Metabolic Equivalents (METs) from heart rate.
 * @param heartRate - Current heart rate.
 * @param age - Age in years.
 * @returns Estimated METs.
 */
const estimateMETs = (heartRate: number, age: number): number => {
  const maxHr = 208 - 0.7 * age // More accurate formula for max HR
  const percentageMaxHr = heartRate / maxHr

  // Linear model to estimate METs from %HRmax
  // Based on assumptions: at 50% HRmax METs are 3, at 90% HRmax METs are 10.
  const mets = 17.5 * percentageMaxHr - 5.75
  return Math.max(1, mets) // METs should be at least 1 (resting).
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
  const { heartRate, age, weightKg, durationMinutes, heightCm, gender } = params

  if (heartRate <= 30 || durationMinutes <= 0) {
    return 0
  }

  // Fallback to old formula if new parameters are not provided
  if (
    typeof heightCm === 'undefined' ||
    typeof gender === 'undefined' ||
    typeof weightKg === 'undefined'
  ) {
    if (typeof weightKg === 'undefined') {
      return 0
    }
    // A simplified, gender-neutral version of the Harris-Benedict equation, adapted for activity.
    /**
     * Constants used in the calorie estimation formula.
     * These values are derived from the Journal of Sports Sciences:
     * https://www.tandfonline.com/doi/abs/10.1080/02640410400023363
     */
    const CALORIE_ESTIMATION_CONSTANTS = {
      INTERCEPT: -55.0969,
      HR_FACTOR: 0.6309,
      WEIGHT_FACTOR: 0.1988,
      AGE_FACTOR: 0.2017,
      KJ_TO_KCAL: 4.184,
    }
    const heartRateTerm = CALORIE_ESTIMATION_CONSTANTS.HR_FACTOR * heartRate
    const weightTerm = CALORIE_ESTIMATION_CONSTANTS.WEIGHT_FACTOR * weightKg
    const ageTerm = CALORIE_ESTIMATION_CONSTANTS.AGE_FACTOR * age
    const caloriesPerMinute =
      (CALORIE_ESTIMATION_CONSTANTS.INTERCEPT +
        heartRateTerm +
        weightTerm +
        ageTerm) /
      CALORIE_ESTIMATION_CONSTANTS.KJ_TO_KCAL

    const totalCalories = caloriesPerMinute * durationMinutes
    return Math.max(0, totalCalories) // Ensure result is non-negative
  }

  const bmrPerDay = calculateBMR(weightKg, heightCm, age, gender)
  const bmrPerMinute = bmrPerDay / (24 * 60)
  const mets = estimateMETs(heartRate, age)
  const caloriesPerMinute = mets * bmrPerMinute
  const totalCalories = caloriesPerMinute * durationMinutes

  return Math.max(0, totalCalories)
}
