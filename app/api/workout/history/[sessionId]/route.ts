// app/api/workout/history/[sessionId]/route.ts
import { NextResponse } from 'next/server'
import { hrmDataService } from '../../../../../services/hrmDataService'

export async function GET(
  request: Request,
  { params }: { params: { sessionId: string } }
) {
  try {
    const sessionDetails = hrmDataService.getSessionDetails(params.sessionId)
    if (!sessionDetails) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 })
    }
    return NextResponse.json(sessionDetails)
  } catch (error) {
    console.error('Error fetching session details:', error)
    return NextResponse.json(
      { error: 'Failed to fetch session details' },
      { status: 500 }
    )
  }
}
