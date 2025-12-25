/**
 * @file Calorie burn calculations.
 * @see https://www.freedieting.com/heart-rate-calculator
 */

/**
 * Calculates the calories burned during a workout.
 *
 * @param {object} params The parameters for the calculation.
 * @param {number} params.heartRate The average heart rate during the workout.
 * @param {number} params.age The user's age in years.
 * @param {number} params.weight The user's weight in kilograms.
 * @param {string} params.gender The user's gender ('male' or 'female').
 * @param {number} params.durationSeconds The duration of the workout in seconds.
 * @returns {number} The total calories burned.
 */
export const calculateCaloriesBurned = ({
  heartRate,
  age,
  weight,
  gender,
  durationSeconds,
}: {
  heartRate: number
  age: number
  weight: number
  gender: 'male' | 'female'
  durationSeconds: number
}): number => {
  const durationMinutes = durationSeconds / 60
  if (gender === 'male') {
    return (
      ((-55.0969 + 0.6309 * heartRate + 0.1988 * weight + 0.2017 * age) /
        4.184) *
      durationMinutes
    )
  } else {
    return (
      ((-20.4022 + 0.4472 * heartRate - 0.1263 * weight + 0.074 * age) /
        4.184) *
      durationMinutes
    )
  }
}
