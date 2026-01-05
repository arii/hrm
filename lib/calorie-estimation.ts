/**
 * @fileoverview Calorie estimation utilities.
 * @description Provides functions to estimate calorie burn based on heart rate and other physiological data.
 * This file contains two distinct estimation models:
 * 1. `estimateIncrementalCaloriesBurned`: A gender-neutral model for real-time, incremental calorie updates.
 * 2. `calculateTotalWorkoutCalories`: A gender-specific model (Mifflin-St Jeor) for a final, total workout summary.
 */

/**
 * Interface for the parameters used in the total workout calorie estimation.
 *
 * @interface TotalWorkoutCalorieParams
 * @property {number} age - User's age in years.
 * @property {number} weight - User's weight in kilograms.
 * @property {'male' | 'female'} [gender] - User's gender.
 * @property {number} workoutDuration - Total duration of the workout in seconds.
 * @property {number} avgHr - Average heart rate during the workout.
 */
interface TotalWorkoutCalorieParams {
  age: number
  weight: number
  gender?: 'male' | 'female'
  workoutDuration: number
  avgHr: number
}

/**
 * Interface for the parameters used in the incremental calorie estimation.
 *
 * @interface IncrementalCalorieParams
 * @property {number} heartRate - Current heart rate.
 * @property {number} age - User's age in years.
 * @property {number} weight - User's weight in kilograms.
 * @property {number} durationMinutes - Duration of the interval in minutes.
 */
interface IncrementalCalorieParams {
  heartRate: number
  age: number
  weight: number
  durationMinutes: number
}

/**
 * Estimates total calories burned during a workout using a gender-specific formula.
 * This is intended for a final calculation at the end of a workout.
 *
 * @param {TotalWorkoutCalorieParams} params - The parameters for the calculation.
 * @returns {number} The estimated total calories burned.
 */
export const calculateTotalWorkoutCalories = ({
  age,
  weight,
  gender,
  workoutDuration,
  avgHr,
}: TotalWorkoutCalorieParams): number => {
  const durationHours = workoutDuration / 3600
  if (gender === 'male') {
    return Math.round(
      ((-55.0969 + 0.6309 * avgHr + 0.1988 * weight + 0.2017 * age) / 4.184) *
        60 *
        durationHours
    )
  } else if (gender === 'female') {
    return Math.round(
      ((-20.4022 + 0.4472 * avgHr - 0.1263 * weight + 0.074 * age) / 4.184) *
        60 *
        durationHours
    )
  }
  return 0 // Return 0 if gender is not specified
}

/**
 * Estimates calories burned over a short, real-time interval using a gender-neutral formula.
 * This is suitable for providing live, incremental updates during a workout.
 *
 * @param {IncrementalCalorieParams} params - The parameters for the calculation.
 * @returns {number} The estimated calories burned during the interval.
 */
export const estimateIncrementalCaloriesBurned = ({
  heartRate,
  age,
  weight,
  durationMinutes,
}: IncrementalCalorieParams): number => {
  // A simplified, gender-neutral formula for real-time estimation.
  // This is a placeholder and can be replaced with a more accurate model if needed.
  const caloriesPerMinute =
    (heartRate * 0.6309 - age * 0.2017 + weight * 0.1988 - 55.0969) / 4.184
  const estimatedCalories = caloriesPerMinute * durationMinutes
  return Math.max(0, estimatedCalories) // Ensure calories are not negative
}
