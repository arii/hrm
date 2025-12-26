// app/api/workout/history/[sessionId]/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { hrmDataService } from '../../../../../services/hrmDataService'
import logger from '../../../../../utils/logger'

export async function GET(
  _request: NextRequest,
  { params }: { params: { sessionId: string } }
): Promise<NextResponse> {
  try {
    const sessionDetails = hrmDataService.getSessionDetails(params.sessionId)
    if (!sessionDetails) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 })
    }
    return NextResponse.json(sessionDetails)
  } catch (error) {
    logger.error(
      { err: error, sessionId: params.sessionId },
      'Failed to fetch session details'
    )
    return NextResponse.json(
      { error: 'Failed to fetch session details' },
      { status: 500 }
    )
  }
}
