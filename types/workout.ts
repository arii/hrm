// types/workout.ts

export interface HeartRateZoneDistribution {
  zone1: number; // 50-60% of max HR
  zone2: number; // 60-70% of max HR
  zone3: number; // 70-80% of max HR
  zone4: number; // 80-90% of max HR
  zone5: number; // 90-100% of max HR
}

export interface Workout {
  id: string; // Unique Workout ID
  userId: string; // ID of the user who performed the workout
  timestamp: string; // ISO 8601 timestamp of when the workout was completed
  duration: number; // Workout duration in seconds
  averageHeartRate: number;
  maxHeartRate: number;
  caloriesBurned: number;
  trainingLoad: number; // TRIMP (Training Impulse) score
  zoneDistribution: HeartRateZoneDistribution; // Time in seconds spent in each HR zone
}

export type WorkoutHistory = Workout[];
