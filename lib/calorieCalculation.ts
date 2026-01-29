// lib/calorieCalculation.ts

/**
 * Interface for the parameters required to estimate calories burned.
 */
export interface CalorieEstimationParams {
  heartRate: number
  age: number
  weightKg: number
  durationMinutes: number
  isMale: boolean
}

/**
 * Estimates calories burned using the Karvonen formula, which is widely
 * used for its accuracy by incorporating heart rate.
 *
 * @param params - The input parameters for the calculation.
 * @returns The estimated number of calories burned.
 */
export const estimateCaloriesBurned = (
  params: CalorieEstimationParams
): number => {
  const { heartRate, age, weightKg, durationMinutes, isMale } = params

  if (heartRate <= 0 || age <= 0 || weightKg <= 0 || durationMinutes <= 0) {
    return 0
  }

  // Karvonen formula for calorie burn estimation
  const caloriesBurned = isMale
    ? ((-55.0969 +
        0.6309 * heartRate +
        0.1988 * weightKg +
        0.2017 * age) /
        4.184) *
      durationMinutes
    : ((-20.4022 +
        0.4472 * heartRate -
        0.1263 * weightKg +
        0.074 * age) /
        4.184) *
      durationMinutes

  return Math.max(0, caloriesBurned)
}
