import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { generateFIT } from '@/services/exportService'
import { RouteContext } from '@/lib/types/index'
import logger from '@/utils/logger'
import { z } from 'zod'
import { WorkoutSessionData } from '@/lib/workout-session-storage'

/**
 * API route to export workout session data to Strava.
 * It receives the session data from the client, generates a .fit file,
 * and uploads it to the Strava API.
 */

const ExportPayloadSchema = z.object({
  hrHistory: z
    .array(
      z.object({
        time: z.number(),
        hr: z.number(),
      })
    )
    .min(1),
  sessionId: z.string().optional(),
  startTime: z.number(),
  endTime: z.number().nullable().optional(),
  averageHr: z.number(),
  maxHr: z.number(),
  totalCaloriesBurned: z.number(),
})

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

    const body = await req.json()
    const validation = ExportPayloadSchema.safeParse(body)

    if (!validation.success) {
      logger.warn({ error: validation.error }, 'Invalid workout data')
      return NextResponse.json(
        { error: 'Invalid workout data' },
        { status: 400 }
      )
    }

    const workoutData = validation.data

    // Consolidated logging and FIT generation
    logger.info({ sessionId }, 'Generating FIT and uploading to Strava')

    const fitBuffer = generateFIT(workoutData as unknown as WorkoutSessionData)

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
      const errorData: unknown = await stravaResponse.json()
      logger.error({ errorData, sessionId }, 'Strava upload failed')
      return NextResponse.json(
        { error: 'Failed to upload to Strava', details: errorData },
        { status: stravaResponse.status }
      )
    }

    const result: unknown = await stravaResponse.json()
    const uploadId =
      result && typeof result === 'object' && 'id' in result ? result.id : null

    logger.info({ sessionId, uploadId }, 'Strava upload successful')

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
