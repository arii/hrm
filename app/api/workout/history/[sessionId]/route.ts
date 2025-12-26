// File: app/api/workout/history/[sessionId]/route.ts
/**
 * API Route: Fetches details for a single workout session.
 */
import { NextResponse } from 'next/server'
import { withErrorHandler } from '@/lib/middleware/errorHandler.js'
import { getSessionDetails } from '@/services/hrmDataService.js'
import { ApiError } from '@/lib/errors.js'

// A placeholder for getting the current user's ID
const getCurrentUserId = async (): Promise<string> => {
  return 'default-user'
}

/**
 * GET handler for fetching single workout session details.
 * @param _req The incoming Request object.
 * @param params The route parameters, containing the sessionId.
 * @returns A NextResponse with the session details or a 404 error.
 */
async function getWorkoutSessionDetails(
  _req: Request,
  { params }: { params: { sessionId: string } }
) {
  const { sessionId } = params
  const userId = await getCurrentUserId()

  if (!sessionId) {
    throw new ApiError(400, 'Session ID is required.')
  }

  const session = await getSessionDetails(sessionId, userId)

  if (!session) {
    throw new ApiError(404, 'Workout session not found.')
  }

  return NextResponse.json(session)
}

export const GET = withErrorHandler(getWorkoutSessionDetails)
