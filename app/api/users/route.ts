// app/api/users/route.ts
import { withValidation } from '@/lib/middleware/validation'
import {
  CreateUserProfileSchema,
  GetUserProfileSchema,
  RequestHeadersSchema,
} from '@/lib/validation/schemas'
import { UserProfile } from '@/types/data-models'
import { NextResponse } from 'next/server'
import { v4 as uuidv4 } from 'uuid'

/**
 * Handles the POST request to create a new user.
 *
 * @param {Request} req - The incoming request.
 * @param {object} context - The context object, containing the validated body.
 * @param {Omit<UserProfile, 'id' | 'createdAt' | 'updatedAt'>} context.body - The validated user profile data.
 * @param {Request} _req - The incoming request (unused).
 * @param {object} context - The context object, containing the validated body.
 * @param {Omit<UserProfile, 'id' | 'createdAt' | 'updatedAt'>} context.body - The validated user profile data.
 * @returns {Promise<NextResponse>} A promise that resolves to the response.
 */
async function createUser(
  _req: Request,
  { body }: { body: Omit<UserProfile, 'id' | 'createdAt' | 'updatedAt'> }
): Promise<NextResponse> {
  // In a real application, you would save the user to a database.
  // For this example, we'll just return the created user.
  const newUser: UserProfile = {
    id: uuidv4(),
    ...body,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  }

  return NextResponse.json(newUser, { status: 201 })
}

export const POST = withValidation({ bodySchema: CreateUserProfileSchema })(
  createUser
)

/**
 * Handles the GET request to fetch a user profile.
 *
 * @param {Request} _req - The incoming request (unused).
 * @param {object} context - The context object, containing the validated query.
 * @param {object} context.query - The validated query parameters.
 * @param {string} context.query.userId - The user ID to fetch.
 * @returns {Promise<NextResponse>} A promise that resolves to the response.
 */
async function getUser(
  _req: Request,
  { params }: { params: { userId: string } }
): Promise<NextResponse> {
  // In a real application, you would fetch the user from a database.
  // For this example, we'll just return a mock user.
  const mockUser: UserProfile = {
    id: params.userId,
    username: 'testuser',
    email: 'test@example.com',
    firstName: 'Test',
    lastName: 'User',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  }

  return NextResponse.json(mockUser)
}

export const GET = withValidation({
  paramsSchema: GetUserProfileSchema,
  headersSchema: RequestHeadersSchema,
})(getUser)
