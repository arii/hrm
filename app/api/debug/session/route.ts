import { getServerSession } from 'next-auth'
import { NextResponse } from 'next/server'
import { authOptions } from '@/lib/auth'

if (process.env.NODE_ENV !== 'development') {
  throw new Error('This endpoint is not available in production')
}

/**
 * Debug route to return the server side NextAuth session.
 * Useful to confirm tokens/refresh tokens are present in the session.
 */
export async function GET(_req: Request) {
  try {
    const session = await getServerSession(authOptions)
    return NextResponse.json({ ok: true, session: session ?? null })
  } catch (err) {
    console.error('debug/session error:', err)
    return NextResponse.json({ ok: false, error: String(err) }, { status: 500 })
  }
}
