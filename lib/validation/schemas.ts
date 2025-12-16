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
