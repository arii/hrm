// File: app/api/debug/reset/route.ts
/**
 * API Route: /api/debug/reset
 * Description: Resets the server's in-memory state.
 * Environment: Test-only.
 */
import { NextResponse } from 'next/server'
import { resetState } from '../../../../utils/socketManager'

export async function POST() {
  if (process.env.TESTING !== 'true') {
    return NextResponse.json(
      {
        success: false,
        message: 'Endpoint only available in testing environment (`TESTING=true`)',
      },
      { status: 403 }
    )
  }

  try {
    resetState()
    return NextResponse.json({
      success: true,
      message: 'Server state reset successfully.',
    })
  } catch (error) {
    console.error('Failed to reset server state:', error)
    return NextResponse.json(
      { success: false, message: 'An error occurred during state reset.' },
      { status: 500 }
    )
  }
}
