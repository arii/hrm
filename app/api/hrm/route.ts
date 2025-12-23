// File: app/api/hrm/route.ts
/**
 * API route for fetching historical heart rate monitoring (HRM) data.
 */
import { NextRequest, NextResponse } from 'next/server'
import { getHrmDataHistory } from '../../../services/hrmDataService'

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const since = searchParams.get('since')

  try {
    const history = await getHrmDataHistory(since ? parseInt(since, 10) : undefined)
    return NextResponse.json(history)
  } catch (error) {
    console.error('Failed to retrieve HRM data history:', error)
    return NextResponse.json(
      { error: 'Failed to retrieve HRM data history' },
      { status: 500 }
    )
  }
}
