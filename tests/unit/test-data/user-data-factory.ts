import {
  UserProfile,
  UserPhysicalProfile,
  WorkoutSession,
  HeartRateDataPoint,
  Gender,
  MeasurementSystem
} from '@/types/core'
import { v4 as uuidv4 } from 'uuid'

/**
 * Creates a valid User Identity Profile for testing.
 */
export const createValidUserProfile = (
  overrides: Partial<UserProfile> = {}
): UserProfile => ({
  id: uuidv4(),
  username: 'johndoe',
  email: 'john.doe@example.com',
  firstName: 'John',
  lastName: 'Doe',
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  ...overrides,
})

/**
 * Creates a valid User Physical Profile for testing.
 * DEFAULTS: Imperial system, Male, 30yo, 175 lbs (approx 79.3kg).
 */
export const createValidUserPhysicalProfile = (
  overrides: Partial<UserPhysicalProfile> = {}
): UserPhysicalProfile => ({
  userId: uuidv4(),
  age: 30,
  weight: 79.38, // Stored as KG, derived from ~175 lbs
  gender: 'MALE' as Gender,
  unitSystem: 'IMPERIAL' as MeasurementSystem,
  ...overrides,
})

/**
 * Creates a valid Workout Session.
 */
export const createValidWorkoutSession = (
  overrides: Partial<WorkoutSession> = {}
): WorkoutSession => ({
  id: uuidv4(),
  userId: uuidv4(),
  startedAt: new Date().toISOString(),
  endedAt: null,
  notes: 'Unit test session',
  ...overrides,
})

/**
 * Creates a specific Heart Rate Data Point.
 */
export const createHeartRateDataPoint = (
  overrides: Partial<HeartRateDataPoint> = {}
): HeartRateDataPoint => ({
  id: uuidv4(),
  workoutSessionId: uuidv4(),
  timestamp: Date.now(),
  heartRate: 145,
  ...overrides,
})

/**
 * Helper: Generates a stream of HR data points for a session.
 */
export const generateHeartRateStream = (
  sessionId: string,
  count: number,
  startBpm: number = 100
): HeartRateDataPoint[] => {
  return Array.from({ length: count }).map((_, i) =>
    createHeartRateDataPoint({
      workoutSessionId: sessionId,
      timestamp: Date.now() + i * 1000,
      heartRate: startBpm + (i % 20), // Simple oscillation
    })
  )
}
