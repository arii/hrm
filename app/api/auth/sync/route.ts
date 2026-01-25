// app/api/auth/sync/route.ts
import { getToken } from 'next-auth/jwt'
import { NextRequest, NextResponse } from 'next/server'
import { env } from '@/lib/env'
import logger from '@/utils/logger.server'

export async function POST(req: NextRequest) {
  const token = await getToken({ req })

  if (!token?.accessToken) {
    return NextResponse.json({ error: 'No access token found in session' }, { status: 401 })
  }

  try {
    const response = await fetch(env.INTERNAL_API_URL + '/api/internal/sync-token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        // Add a secret to prevent unauthorized access
        'X-Internal-Secret': env.INTERNAL_API_SECRET,
      },
      body: JSON.stringify({ accessToken: token.accessToken }),
    })

    if (!response.ok) {
      throw new Error('Failed to sync token with internal service')
    }

    return NextResponse.json({ message: 'Token synced successfully' })
  } catch (error) {
    logger.error({ err: error }, 'Error syncing token')
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}
