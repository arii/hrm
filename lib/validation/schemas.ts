/**
 * @file This file contains the Zod schemas for data validation.
 *
 * @see /docs/decisions/0002-api-validation-with-zod.md
 */

import { z } from '@/lib/zod'

// =================================================================
// Data Model Schemas
// =================================================================

export const UserProfileSchema = z.object({
  id: z.string().uuid(),
  username: z.string().min(3, 'Username must be at least 3 characters long.'),
  email: z.string().email(),
  firstName: z.string().nullable(),
  lastName: z.string().nullable(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
})

export const WorkoutSessionSchema = z.object({
  id: z.string().uuid(),
  userId: z.string().uuid(),
  startedAt: z.string().datetime(),
  endedAt: z.string().datetime().nullable(),
  notes: z.string(),
})

export const HeartRateDataPointSchema = z.object({
  id: z.string().uuid(),
  workoutSessionId: z.string().uuid(),
  timestamp: z.number(),
  heartRate: z.number(),
})

export const MeasurementSystemSchema = z.enum(['IMPERIAL', 'METRIC'])
export const GenderSchema = z.enum(['MALE', 'FEMALE'])

export const UserPhysicalProfileSchema = z.object({
  userId: z.string().uuid(),
  age: z.number().min(1).max(120),
  weight: z.number().positive(),
  gender: GenderSchema,
  unitSystem: MeasurementSystemSchema,
  maxHr: z.number().optional(),
})

// =================================================================
// API Request Schemas
// =================================================================

// Example: Schema for creating a new user profile
export const CreateUserProfileSchema = UserProfileSchema.pick({
  username: true,
  email: true,
  firstName: true,
  lastName: true,
})

// Example: Schema for creating a new workout session
export const CreateWorkoutSessionSchema = WorkoutSessionSchema.pick({
  userId: true,
  startedAt: true,
  notes: true,
})

// Example: Schema for adding a new heart rate data point
export const CreateHeartRateDataPointSchema = HeartRateDataPointSchema.pick({
  workoutSessionId: true,
  timestamp: true,
  heartRate: true,
})
