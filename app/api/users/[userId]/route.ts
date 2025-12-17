// app/api/users/[userId]/route.ts
import { withValidation } from '@/lib/middleware/validation'
import { GetUserProfileSchema } from '@/lib/validation/schemas'
import { UserProfile } from '@/types/data-models'
import { NextResponse } from 'next/server'

/**
 * Handles the GET request to fetch a user profile.
 *
 * @param {Request} _req - The incoming request (unused).
 * @param {object} context - The context object, containing the validated params.
 * @param {object} context.params - The validated URL parameters.
 * @param {string} context.params.userId - The user ID to fetch.
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
})(getUser)
