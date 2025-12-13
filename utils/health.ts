// utils/health.ts

/**
 * Estimates calories burned during a workout based on heart rate zones.
 * This formula is a simplified model and should not be considered medically accurate.
 * It provides a more personalized estimate than a simple constant, by factoring in
 * the user's age and average heart rate during the workout.
 *
 * The formula is a weighted average of calories burned per minute in different HR zones.
 * Zone 1 (<60% Max HR): ~4 kcal/min
 * Zone 2 (60-70% Max HR): ~7 kcal/min
 * Zone 3 (70-80% Max HR): ~10 kcal/min
 * Zone 4 (80-90% Max HR): ~13 kcal/min
 * Zone 5 (>90% Max HR): ~16 kcal/min
 *
 * @param averageHr - The user's average heart rate during the workout.
 * @param userAge - The user's age, used to calculate max heart rate.
 * @param durationInSeconds - The total duration of the workout in seconds.
 * @returns An estimated number of calories burned.
 */

const CALORIES_PER_MINUTE_ZONE1 = 4
const CALORIES_PER_MINUTE_ZONE2 = 7
const CALORIES_PER_MINUTE_ZONE3 = 10
const CALORIES_PER_MINUTE_ZONE4 = 13
const CALORIES_PER_MINUTE_ZONE5 = 16

export const calculateCaloriesBurned = (
  averageHr: number,
  userAge: number,
  durationInSeconds: number
): number => {
  if (!averageHr || !userAge || !durationInSeconds) {
    return 0
  }

  const maxHr = 220 - userAge
  const hrPercentage = (averageHr / maxHr) * 100

  let caloriesPerMinute: number
  if (hrPercentage < 60) {
    caloriesPerMinute = CALORIES_PER_MINUTE_ZONE1
  } else if (hrPercentage < 70) {
    caloriesPerMinute = CALORIES_PER_MINUTE_ZONE2
  } else if (hrPercentage < 80) {
    caloriesPerMinute = CALORIES_PER_MINUTE_ZONE3
  } else if (hrPercentage < 90) {
    caloriesPerMinute = CALORIES_PER_MINUTE_ZONE4
  } else {
    caloriesPerMinute = CALORIES_PER_MINUTE_ZONE5
  }

  const durationInMinutes = durationInSeconds / 60
  return durationInMinutes * caloriesPerMinute
}
