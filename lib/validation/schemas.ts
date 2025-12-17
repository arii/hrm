import { z } from 'zod';

// Base schema for user profile properties
export const UserProfileSchema = z.object({
  id: z.string().uuid(),
  username: z.string().min(3, 'Username must be at least 3 characters'),
  email: z.string().email(),
  firstName: z.string().nullable(),
  lastName: z.string().nullable(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

// Schema for creating a new user profile (omits generated fields)
export const CreateUserProfileSchema = UserProfileSchema.omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

// Schema for updating an existing user profile (all fields optional)
export const UpdateUserProfileSchema = CreateUserProfileSchema.partial();

// Schema for a workout session
export const WorkoutSessionSchema = z.object({
  id: z.string().uuid(),
  userId: z.string().uuid(),
  startedAt: z.string().datetime(),
  endedAt: z.string().datetime().nullable(),
  notes: z.string(),
});

// Schema for creating a new workout session
export const CreateWorkoutSessionSchema = WorkoutSessionSchema.omit({
  id: true,
});

// Schema for heart rate data points
export const HeartRateDataPointSchema = z.object({
  id: z.string().uuid(),
  workoutSessionId: z.string().uuid(),
  timestamp: z.number(),
  heartRate: z.number(),
});

export const WorkoutQuerySchema = z.object({
  docId: z.string().min(10, 'A valid Google Doc ID is required.'),
});
