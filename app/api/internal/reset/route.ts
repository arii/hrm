import { NextResponse } from 'next/server'

/**
 * Internal API to reset server state for testing.
 * Clears all HRM sessions and stops the timer.
 */
export async function POST() {
  // Only allow reset if specifically enabled for testing
  if (
    process.env.TESTING !== 'true' &&
    process.env.NEXT_PUBLIC_TESTING !== 'true' &&
    process.env.NODE_ENV === 'production'
  ) {
    return NextResponse.json(
      { error: 'Reset endpoint only available in testing environment' },
      { status: 403 }
    )
  }

  try {
    // 1. Reset Socket Manager (clears HR data and sessions)
    if (global.resetSocketManager) {
      global.resetSocketManager()
    }

    // 2. Stop Tabata Timer
    if (global.tabataService) {
      global.tabataService.stop()
    }

    return NextResponse.json({
      status: 'ok',
      message: 'Server state reset successfully',
    })
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to reset server state' },
      { status: 500 }
    )
  }
}
