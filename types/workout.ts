// types/workout.ts

export interface HeartRateZoneDistribution {
  zone1: number // 50-60% of max HR
  zone2: number // 60-70% of max HR
  zone3: number // 70-80% of max HR
  zone4: number // 80-90% of max HR
  zone5: number // 90-100% of max HR
}

export interface Workout {
  id: string // Unique Workout ID
  userId: string // ID of the user who performed the workout
  timestamp: string // ISO 8601 timestamp of when the workout was completed
  duration: number // Workout duration in seconds
  averageHeartRate: number
  maxHeartRate: number
  caloriesBurned: number
  trainingLoad: number // TRIMP (Training Impulse) score
  zoneDistribution: HeartRateZoneDistribution // Time in seconds spent in each HR zone
}

import { z } from 'zod'

export const workoutSchema = z.object({
  id: z.string().uuid({ message: 'Invalid workout ID format' }),
  userId: z.string().min(1, { message: 'User ID cannot be empty' }),
  timestamp: z.string().datetime({ message: 'Invalid timestamp format' }),
  duration: z.number().positive({ message: 'Duration must be positive' }),
  averageHeartRate: z
    .number()
    .int()
    .gt(0, { message: 'Average heart rate must be greater than 0' }),
  maxHeartRate: z
    .number()
    .int()
    .gt(0, { message: 'Max heart rate must be greater than 0' }),
  caloriesBurned: z
    .number()
    .positive({ message: 'Calories burned must be positive' }),
  trainingLoad: z.number(),
  zoneDistribution: z.object({
    zone1: z.number().int().nonnegative(),
    zone2: z.number().int().nonnegative(),
    zone3: z.number().int().nonnegative(),
    zone4: z.number().int().nonnegative(),
    zone5: z.number().int().nonnegative(),
  }),
})

export type WorkoutHistory = Workout[]
