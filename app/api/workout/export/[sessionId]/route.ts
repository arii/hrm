// app/api/workout/export/[sessionId]/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { generateFIT } from '@/services/exportService'
import { RouteContext } from '@/lib/types/index'
import logger from '@/utils/logger'

/**
 * API route to export workout session data to Strava.
 * It receives the session data from the client, generates a .fit file,
 * and uploads it to the Strava API.
 */
export async function POST(
  req: NextRequest,
  context: RouteContext<{ sessionId: string }>
) {
  try {
    const { sessionId } = await context.params
    const session = await getServerSession(authOptions)

    // Check if user is authenticated and has a Strava token
    if (!session || !session.accessToken) {
      return NextResponse.json(
        { error: 'You must be logged in to export workouts.' },
        { status: 401 }
      )
    }

    if (session.provider !== 'strava') {
      return NextResponse.json(
        {
          error:
            'Please log in with Strava to export workouts to your Strava account.',
        },
        { status: 400 }
      )
    }

    const workoutData = await req.json()

    // Validate workout data
    if (
      !workoutData ||
      !workoutData.hrHistory ||
      workoutData.hrHistory.length === 0
    ) {
      return NextResponse.json(
        { error: 'No heart rate data found for this session.' },
        { status: 400 }
      )
    }

    logger.info({ sessionId }, 'Generating FIT file for export')

    // Generate FIT file binary
    const fitBuffer = generateFIT(workoutData)

    // Prepare Strava upload
    const formData = new FormData()
    // Strava expects a File/Blob for the 'file' parameter
    const blob = new Blob([new Uint8Array(fitBuffer)], {
      type: 'application/octet-stream',
    })
    formData.append('file', blob, `workout_${sessionId}.fit`)
    formData.append('data_type', 'fit')
    formData.append('activity_type', 'workout')
    formData.append(
      'description',
      `Exported from HRM App - Session ${sessionId}`
    )

    logger.info({ sessionId }, 'Uploading workout to Strava')

    const stravaResponse = await fetch(
      'https://www.strava.com/api/v3/uploads',
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${session.accessToken}`,
        },
        body: formData,
      }
    )

    if (!stravaResponse.ok) {
      const errorData = await stravaResponse.json()
      logger.error({ errorData, sessionId }, 'Strava upload failed')
      return NextResponse.json(
        { error: 'Failed to upload to Strava', details: errorData },
        { status: stravaResponse.status }
      )
    }

    const result = await stravaResponse.json()
    logger.info({ sessionId, uploadId: result.id }, 'Strava upload successful')

    return NextResponse.json({
      success: true,
      message: 'Workout successfully queued for upload to Strava.',
      stravaResult: result,
    })
  } catch (error) {
    logger.error({ error }, 'Workout export error')
    return NextResponse.json(
      { error: 'An internal error occurred while exporting the workout.' },
      { status: 500 }
    )
  }
}
