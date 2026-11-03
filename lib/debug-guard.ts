import { NextResponse } from 'next/server'
import { env } from '@/lib/env'

/**
 * Shared gate for read-only debug endpoints (#8874).
 *
 * Blocked in production unless the TESTING bypass is set. Playwright/VRT
 * runs production builds with TESTING=true (see playwright.config.ts
 * webServer env); the real prod deploy never sets TESTING, so these
 * endpoints stay dark there.
 *
 * NOTE: the destructive reset route keeps its own stricter ALLOW_DEBUG_RESET
 * guard and must NOT be migrated to this helper.
 *
 * @returns A 403 response when denied, null when allowed.
 */
export function debugAccessDenied(): NextResponse | null {
  if (env.NODE_ENV === 'production' && env.TESTING !== 'true') {
    return NextResponse.json(
      { error: 'Not available in production' },
      { status: 403 }
    )
  }
  return null
}
