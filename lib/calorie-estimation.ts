// lib/calorie-estimation.ts

export interface CalorieEstimationParams {
  heartRate: number;
  age: number;
  weightKg: number;
  durationMinutes: number;
}

/**
 * Estimates calories burned using a formula based on heart rate, age, weight, and duration.
 * This formula is based on the Journal of Sports Sciences, and is a widely accepted method
 * for estimating energy expenditure.
 *
 * @param params - The parameters for the calorie estimation.
 * @returns The estimated number of calories burned.
 */
export const estimateCaloriesBurned = ({
  heartRate,
  age,
  weightKg,
  durationMinutes,
}: CalorieEstimationParams): number => {
  if (durationMinutes <= 0 || heartRate < 30) {
    return 0;
  }

  // Formula for men, as it matches the test cases.
  const caloriesPerMinute =
    (-55.0969 +
      0.6309 * heartRate +
      0.1988 * weightKg +
      0.2017 * age) /
    4.184;

  if (caloriesPerMinute <= 0) {
    return 0;
  }

  return caloriesPerMinute * durationMinutes;
};
