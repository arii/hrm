import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { generateFIT } from '@/services/exportService'
import { RouteContext } from '@/lib/types/index'
import logger from '@/utils/logger'
import { z } from 'zod'
import { WorkoutSessionData } from '@/lib/workout-session-storage'

/**
 * API route to generate and download a FIT file for a workout session.
 * It receives the session data from the client, generates a .fit file,
 * and returns it as a download.
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

    // Check if user is authenticated
    if (!session) {
      return NextResponse.json(
        { error: 'You must be logged in to export workouts.' },
        { status: 401 }
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

    logger.info({ sessionId }, 'Generating FIT file for download')

    const fitBuffer = generateFIT(workoutData as unknown as WorkoutSessionData)

    return new NextResponse(new Blob([new Uint8Array(fitBuffer)]), {
      headers: {
        'Content-Type': 'application/octet-stream',
        'Content-Disposition': `attachment; filename="workout_${sessionId}.fit"`,
      },
    })
  } catch (error) {
    logger.error({ error }, 'Workout export error')
    return NextResponse.json(
      { error: 'An internal error occurred while exporting the workout.' },
      { status: 500 }
    )
  }
}
