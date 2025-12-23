// File: app/api/hrm/route.ts
/**
 * API route for fetching historical heart rate monitoring (HRM) data.
 */
import { NextRequest, NextResponse } from 'next/server'
import { getHrmDataHistory } from '../../../services/hrmDataService'
import { z } from 'zod'

const QueryParamsSchema = z.object({
  since: z.coerce.number().int().positive().optional(),
})

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const query = Object.fromEntries(searchParams.entries())

  const validationResult = QueryParamsSchema.safeParse(query)

  if (!validationResult.success) {
    return NextResponse.json(
      {
        error: 'Invalid query parameters',
        details: validationResult.error.flatten(),
      },
      { status: 400 }
    )
  }

  const { since } = validationResult.data

  try {
    const history = await getHrmDataHistory(since)
    return NextResponse.json(history)
  } catch (error) {
    console.error('Failed to retrieve HRM data history:', error)
    return NextResponse.json(
      { error: 'Failed to retrieve HRM data history' },
      { status: 500 }
    )
  }
}
