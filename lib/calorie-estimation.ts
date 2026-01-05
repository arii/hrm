interface CalorieEstimationParams {
  age: number;
  weight: number;
  gender?: 'male' | 'female';
  workoutDuration: number;
  avgHr: number;
  heartRate?: number;
}

export const estimateCaloriesBurned = ({
  age,
  weight,
  gender,
  workoutDuration,
  avgHr,
}: CalorieEstimationParams): number => {
  if (gender === 'male') {
    return Math.round(
      ((-55.0969 + 0.6309 * avgHr + 0.1988 * weight + 0.2017 * age) / 4.184) *
        60 *
        (workoutDuration / 3600)
    )
  } else if (gender === 'female') {
    return Math.round(
      ((-20.4022 + 0.4472 * avgHr - 0.1263 * weight + 0.074 * age) / 4.184) *
        60 *
        (workoutDuration / 3600)
    )
  }
  return 0
};
