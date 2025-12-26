// File: app/api/workout/history/route.ts
/**
 * API Route: Fetches a user's workout session history.
 */
import { NextResponse } from 'next/server'
import { withErrorHandler, ApiHandler } from '@/lib/middleware/errorHandler'
import { getSessionHistory } from '@/services/hrmDataService'

// A placeholder for getting the current user's ID
// In a real app, this would come from an authentication session using a server-side method.
const getCurrentUserId = async (): Promise<string> => {
  // Example for server-side session:
  // const session = await getServerSession(authOptions);
  // if (!session?.user?.id) throw new ApiError(401, 'Not authenticated');
  // return session.user.id;
  return 'default-user'
}

/**
 * GET handler for fetching workout history.
 * @param req The incoming Request object.
 * @returns A NextResponse with the list of workout sessions.
 */
const getWorkoutHistory: ApiHandler = async (req) => {
  const userId = await getCurrentUserId()
  const { searchParams } = new URL(req.url)
  const limit = parseInt(searchParams.get('limit') || '50', 10)
  const offset = parseInt(searchParams.get('offset') || '0', 10)

  const sessions = await getSessionHistory(userId, limit, offset)

  return NextResponse.json(sessions)
}

export const GET = withErrorHandler(getWorkoutHistory)
