/**
 * @fileoverview Utility functions for calculations, starting with calorie estimation.
 */

/**
 * Represents a single heart rate measurement at a specific time.
 */
interface HeartRateDataPoint {
  timestamp: number // UNIX timestamp in milliseconds
  value: number // Heart rate in beats per minute
}

/**
 * Estimates calories burned during a workout session using a gender-neutral formula
 * based on the Journal of Sports Sciences. This formula uses average heart rate and age.
 *
 * Formula derived from:
 * Men:   C/min = (-55.0969 + 0.6309 * HR + 0.2017 * Age) / 4.184
 * Women: C/min = (-20.4022 + 0.4472 * HR + 0.074 * Age) / 4.184
 * Averaged for a gender-neutral estimate.
 *
 * @param {number} age - The user's age in years.
 * @param {HeartRateDataPoint[]} hrData - An array of heart rate data points recorded during the session.
 * @returns {number} The estimated total calories burned. Returns 0 if data is insufficient.
 */
export const calculateCaloriesBurned = (
  age: number,
  hrData: HeartRateDataPoint[]
): number => {
  if (hrData.length < 2 || age <= 0) {
    return 0
  }

  // Calculate average heart rate
  const totalHr = hrData.reduce((sum, point) => sum + point.value, 0)
  const averageHr = totalHr / hrData.length

  // If average HR is unrealistic, return 0
  if (averageHr < 40 || averageHr > 250) {
    return 0
  }

  // Calculate duration in minutes
  const startTime = hrData[0].timestamp
  const endTime = hrData[hrData.length - 1].timestamp
  const durationInMinutes = (endTime - startTime) / (1000 * 60)

  if (durationInMinutes <= 0) {
    return 0
  }

  // Gender-neutral averaged coefficients
  const C_CONST = -37.74955 // (-55.0969 - 20.4022) / 2
  const C_HR = 0.53905 // (0.6309 + 0.4472) / 2
  const C_AGE = 0.13785 // (0.2017 + 0.074) / 2
  const KCAL_CONVERSION_FACTOR = 4.184

  const caloriesPerMinute =
    (C_CONST + C_HR * averageHr + C_AGE * age) / KCAL_CONVERSION_FACTOR

  const totalCalories = caloriesPerMinute * durationInMinutes

  // Return non-negative value
  return Math.max(0, totalCalories)
}
