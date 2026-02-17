import { NextRequest, NextResponse } from 'next/server'
import { generateFIT } from '@/services/exportService'
import { RouteContext } from '@/lib/types/index'
import logger from '@/utils/logger'
import { z } from 'zod'

/**
 * API route to export workout session data as a FIT file for download.
 * Receives workout session data and generates a .fit file.
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
    const body = await req.json()

    const validationResult = ExportPayloadSchema.safeParse(body)
    if (!validationResult.success) {
      logger.error('Invalid export payload', validationResult.error)
      return NextResponse.json(
        { error: 'Invalid workout data format' },
        { status: 400 }
      )
    }

    const sessionData = validationResult.data

    // Generate FIT file
    const fitBuffer = generateFIT(sessionData)

    // Return the FIT file as a download
    return new NextResponse(fitBuffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/octet-stream',
        'Content-Disposition': `attachment; filename="workout-${sessionId}.fit"`,
      },
    })
  } catch (error) {
    logger.error('Error exporting workout', error)
    return NextResponse.json(
      { error: 'Failed to export workout' },
      { status: 500 }
    )
  }
}
