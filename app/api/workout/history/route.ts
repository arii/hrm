// app/api/workout/history/route.ts
import { NextResponse } from 'next/server'
import { hrmDataService } from '../../../../services/hrmDataService'
import logger from '../../../../utils/logger'

export async function GET() {
  try {
    const sessions = hrmDataService.getSessionHistory()
    return NextResponse.json(sessions)
  } catch (error) {
    logger.error({ err: error }, 'Failed to fetch session history')
    return NextResponse.json(
      { error: 'Failed to fetch session history' },
      { status: 500 }
    )
  }
}
