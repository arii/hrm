/**
 * @file This file contains the Zod schemas for data validation.
 *
 * @see /docs/decisions/0002-api-validation-with-zod.md
 */

import { z } from '../zod'

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

export const SpotifyTokenPayloadSchema = z.object({
  provider: z.string(),
  sub: z.string(),
  access_token: z.string(),
  refresh_token: z.string(),
  expires_in: z.number(),
  scope: z.string(),
  obtainedAt: z.number(),
})

/**
 * A simple validation utility that wraps Zod's parse method.
 *
 * @template T - The type of the Zod schema.
 * @param {T} schema - The Zod schema to validate against.
 * @param {unknown} data - The data to validate.
 * @returns {z.infer<T>} - The validated data, conforming to the schema's inferred type.
 * @throws {z.ZodError} - Throws a ZodError if validation fails, which can be caught and handled.
 */
export function validate<T extends z.ZodTypeAny>(
  schema: T,
  data: unknown
): z.infer<T> {
  return schema.parse(data)
}
