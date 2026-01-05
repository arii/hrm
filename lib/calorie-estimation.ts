interface CalorieEstimationParams {
  age: number
  weight: number
  gender?: 'male' | 'female'
  workoutDuration: number
  avgHr: number
}

export const estimateCaloriesBurned = (
  params: CalorieEstimationParams
): number => {
  // Placeholder for calorie estimation logic - needs full implementation
  return 0
}
