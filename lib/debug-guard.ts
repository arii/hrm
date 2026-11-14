import { NextResponse } from 'next/server'
import { env } from '@/lib/env'
import { isDebugBlocked } from '@/lib/debug-gate'

/**
 * Shared gate for read-only debug endpoints (#8874).
 *
 * NOTE: the destructive reset route keeps its own stricter ALLOW_DEBUG_RESET
 * guard and must NOT be migrated to this helper.
 *
 * @returns A 403 response when denied, null when allowed.
 */
export function debugAccessDenied(): NextResponse | null {
  if (isDebugBlocked(env.NODE_ENV, env.TESTING)) {
    return NextResponse.json(
      { error: 'Not available in production' },
      { status: 403 }
    )
  }
  return null
}
