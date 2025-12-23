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
}

export interface CalorieCalculator {
  calculate(params: CalorieEstimationParams): number
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
export class KeytelFormula implements CalorieCalculator {
  public calculate(params: CalorieEstimationParams): number {
    const { heartRate, age, weightKg, durationMinutes } = params

    if (heartRate <= 30 || durationMinutes <= 0) {
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
}

export class CustomFormula implements CalorieCalculator {
  public calculate(params: CalorieEstimationParams): number {
    // Placeholder for a custom formula. This can be adapted as needed.
    const { weightKg, durationMinutes } = params
    // Example: A simple MET-based formula where 1 MET ~ 1 kcal/kg/hour
    const METs = 5 // Assuming a constant MET value for a generic activity
    const calories = (METs * weightKg * durationMinutes) / 60
    return Math.max(0, calories)
  }
}

// The estimateCaloriesBurned function has been moved to CalorieService.
// This file now only contains the strategy implementations.
