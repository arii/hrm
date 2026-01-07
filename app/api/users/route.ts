
// app/api/users/route.ts
import { withValidation } from '@/lib/middleware/validation'
import { CreateUserProfileSchema } from '@/lib/validation/schemas'
import { UserProfile } from '@/types/core'
import { NextRequest, NextResponse } from 'next/server'
import { v4 as uuidv4 } from 'uuid'

type ValidatedBody = Omit<UserProfile, 'id' | 'createdAt' | 'updatedAt'>

/**
 * Handles the POST request to create a new user.
 * The request body is validated by the `withValidation` middleware.
 *
 * @param _req - The incoming NextRequest (unused).
 * @param validatedBody - The validated user profile data from the request body.
 * @returns A promise that resolves to the new user profile.
 */
async function createUser(
  _req: NextRequest,
  validatedBody: ValidatedBody
): Promise<NextResponse> {
  // In a real application, you would save the user to a database.
  // For this example, we'll just return the created user with a new ID and timestamps.
  const newUser: UserProfile = {
    id: uuidv4(),
    ...validatedBody,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  }

  return NextResponse.json(newUser, { status: 201 })
}

// Wrap the createUser handler with the validation middleware
export const POST = withValidation(CreateUserProfileSchema, createUser)
