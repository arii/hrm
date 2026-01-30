import {
  UserProfile,
  UserPhysicalProfile,
  WorkoutSession,
  HeartRateDataPoint,
} from '@/types/core'
import { v4 as uuidv4 } from 'uuid'

// --- User Identity Factory ---
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

// --- User Physical Profile Factory ---
export const createValidUserPhysicalProfile = (
  overrides: Partial<UserPhysicalProfile> = {}
): UserPhysicalProfile => ({
  userId: uuidv4(),
  age: 30,
  weight: 75, // 75kg
  gender: 'MALE',
  unitSystem: 'METRIC',
  ...overrides,
})

// --- Workout Session Factory ---
export const createValidWorkoutSession = (
  overrides: Partial<WorkoutSession> = {}
): WorkoutSession => ({
  id: uuidv4(),
  userId: uuidv4(),
  startedAt: new Date().toISOString(),
  endedAt: null,
  notes: 'Test workout session',
  ...overrides,
})

// --- Heart Rate Data Point Factory ---
export const createHeartRateDataPoint = (
  overrides: Partial<HeartRateDataPoint> = {}
): HeartRateDataPoint => ({
  id: uuidv4(),
  workoutSessionId: uuidv4(),
  timestamp: Date.now(),
  heartRate: 120, // default bpm
  ...overrides,
})
