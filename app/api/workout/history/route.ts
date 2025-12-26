// app/api/workout/history/route.ts
import { NextResponse } from 'next/server'
import { hrmDataService } from '../../../../services/hrmDataService'

export async function GET() {
  try {
    const sessions = hrmDataService.getSessionHistory()
    return NextResponse.json(sessions)
  } catch (error) {
    console.error('Error fetching session history:', error)
    return NextResponse.json(
      { error: 'Failed to fetch session history' },
      { status: 500 }
    )
  }
}
