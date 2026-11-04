import { getServerSession } from 'next-auth'
import { NextResponse } from 'next/server'
import { authOptions } from '@/lib/auth'
import { debugAccessDenied } from '@/lib/debug-guard'
import logger from '@/utils/logger.server'

/**
 * Debug route to return the server side NextAuth session.
 * Useful to confirm tokens/refresh tokens are present in the session.
 */
export async function GET(_req: Request) {
  const denied = debugAccessDenied()
  if (denied) return denied
  try {
    const session = await getServerSession(authOptions)
    return NextResponse.json({ ok: true, session: session ?? null })
  } catch (err) {
    logger.error('debug/session error:', err)
    return NextResponse.json({ ok: false, error: String(err) }, { status: 500 })
  }
}
