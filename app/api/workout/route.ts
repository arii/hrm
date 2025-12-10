// File: app/api/workout/route.ts
/**
 * API Route: Fetches structured workout data from the Google Doc parser service.
 */
import { NextResponse } from 'next/server'
import { parseGoogleDocTable } from '../../../services/googleDocParser'
import { getGoogleDocWorkoutUrl } from '../../../utils/urls'

export async function GET() {
  const docUrl = getGoogleDocWorkoutUrl()
  if (!docUrl) {
    return NextResponse.json(
      { error: 'Google Doc URL is not configured' },
      { status: 500 }
    )
  }

  try {
    const data = await parseGoogleDocTable(docUrl)

    if (!data) {
      return NextResponse.json(
        { error: 'Failed to parse workout data' },
        { status: 500 }
      )
    }

    // Cache the response for 5 minutes to prevent excessive fetching.
    const headers = {
      'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=60',
    }

    return NextResponse.json(data, { headers })
  } catch (error) {
    console.error('API Error fetching workout data:', error)
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 }
    )
  }
}
